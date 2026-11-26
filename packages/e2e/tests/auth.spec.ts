import { execFile } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { spawnServer, withDatabase } from "./support/server.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));

const TOKEN_PATTERN = /^waw_dev_[A-Za-z0-9_-]{43}$/;

// Longer than the helpers' own deadlines, so their errors (with the server output) surface.
test.describe.configure({ timeout: 90_000 });

interface Credential {
	id: string;
	token: string;
}

interface CliResult {
	code: number;
	stdout: string;
	stderr: string;
}

/** Runs the compiled operator CLI in the server's environment. */
function runCli(databaseUrl: string, args: string[]): Promise<CliResult> {
	return new Promise((resolve, reject) => {
		execFile(
			process.execPath,
			["apps/core-server/dist/auth/token-cli.js", ...args],
			{
				cwd: root,
				env: { ...process.env, DATABASE_URL: databaseUrl },
				timeout: 30_000,
			},
			(error, stdout, stderr) => {
				const code = error ? error.code : 0;
				// A string or missing code means the CLI did not exit by itself.
				if (typeof code !== "number") {
					reject(error);
					return;
				}
				resolve({ code, stdout, stderr });
			},
		);
	});
}

async function issueWithCli(databaseUrl: string): Promise<Credential> {
	const { code, stdout, stderr } = await runCli(databaseUrl, ["issue"]);
	expect(code, stderr).toBe(0);
	expect(stdout).toMatch(/^[^\n]+\n$/);
	const credential = JSON.parse(stdout) as Credential;
	expect(Object.keys(credential).sort()).toEqual(["id", "token"]);
	expect(credential.token).toMatch(TOKEN_PATTERN);
	return credential;
}

async function revokeWithCli(databaseUrl: string, id: string): Promise<void> {
	const { code, stdout, stderr } = await runCli(databaseUrl, ["revoke", id]);
	expect(code, stderr).toBe(0);
	expect(stdout).toBe("");
	expect(stderr).toBe("");
}

async function withServer(
	run: (baseUrl: string, databaseUrl: string) => Promise<void>,
): Promise<void> {
	await withDatabase(async (databaseUrl) => {
		const server = spawnServer(databaseUrl);
		try {
			await run(await server.listening(), databaseUrl);
		} finally {
			await server.stop();
		}
	});
}

function bearer(token: string): Record<string, string> {
	return { authorization: `Bearer ${token}` };
}

async function expectAuthenticated(
	baseUrl: string,
	credential: Credential,
): Promise<void> {
	const response = await fetch(`${baseUrl}/tokens/current`, {
		headers: bearer(credential.token),
	});
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ id: credential.id });
}

async function expectUnauthorized(response: Response): Promise<void> {
	expect(response.status).toBe(401);
	expect(response.headers.get("www-authenticate")).toBe("Bearer");
	expect(await response.json()).toEqual({ error: "unauthorized" });
}

test("REQ-010 AC-36 REQ-001 AC-01 keeps /health public with the token routes installed", async () => {
	await withServer(async (baseUrl) => {
		await expectUnauthorized(await fetch(`${baseUrl}/tokens/current`));

		const response = await fetch(`${baseUrl}/health`);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ apiVersion: 1, capabilities: [] });
	});
});

test("issues a device token with the CLI that authenticates and is stored only as a digest", async () => {
	await withServer(async (baseUrl, databaseUrl) => {
		const credential = await issueWithCli(databaseUrl);
		await expectAuthenticated(baseUrl, credential);

		const client = new Client({ connectionString: databaseUrl });
		await client.connect();
		try {
			const { rows } = await client.query<{ token_hash: string }>(
				"SELECT * FROM public.device_tokens",
			);
			expect(rows.map((row) => row.token_hash)).toEqual([
				createHash("sha256").update(credential.token).digest("hex"),
			]);
			// Neither the whole token nor its secret part, in any column.
			expect(JSON.stringify(rows)).not.toContain(
				credential.token.slice("waw_dev_".length),
			);
		} finally {
			await client.end();
		}
	});
});

test("issues and revokes device tokens independently over HTTP and the CLI", async () => {
	await withServer(async (baseUrl, databaseUrl) => {
		const first = await issueWithCli(databaseUrl);

		const issued = await fetch(`${baseUrl}/tokens`, {
			method: "POST",
			headers: bearer(first.token),
		});
		expect(issued.status).toBe(201);
		expect(issued.headers.get("cache-control")).toContain("no-store");
		const second = (await issued.json()) as Credential;
		expect(second.token).toMatch(TOKEN_PATTERN);
		expect(second.token).not.toBe(first.token);
		expect(second.id).not.toBe(first.id);
		await expectAuthenticated(baseUrl, second);

		const revoked = await fetch(`${baseUrl}/tokens/${second.id}`, {
			method: "DELETE",
			headers: bearer(first.token),
		});
		expect(revoked.status).toBe(204);
		await expectUnauthorized(
			await fetch(`${baseUrl}/tokens/current`, {
				headers: bearer(second.token),
			}),
		);
		await expectAuthenticated(baseUrl, first);

		await revokeWithCli(databaseUrl, first.id);
		await expectUnauthorized(
			await fetch(`${baseUrl}/tokens/current`, {
				headers: bearer(first.token),
			}),
		);
		// An unknown id is not an error.
		await revokeWithCli(databaseUrl, randomUUID());
	});
});

test("rejects missing, malformed, unknown and revoked tokens with a Bearer challenge", async () => {
	await withServer(async (baseUrl, databaseUrl) => {
		const revoked = await issueWithCli(databaseUrl);
		await expectAuthenticated(baseUrl, revoked);
		await revokeWithCli(databaseUrl, revoked.id);

		const unknown = `waw_dev_${randomBytes(32).toString("base64url")}`;
		const rejected: Record<string, string>[] = [
			{},
			bearer("abc"),
			{ authorization: `Basic ${btoa("waw:abc")}` },
			bearer(unknown),
			bearer(revoked.token),
		];
		for (const headers of rejected) {
			await expectUnauthorized(
				await fetch(`${baseUrl}/tokens/current`, { headers }),
			);
		}
	});
});

test("the CLI rejects bad usage without touching stdout", async () => {
	await withServer(async (_baseUrl, databaseUrl) => {
		const badUsage = [
			["revoke", "not-a-uuid"],
			["revoke"],
			["revoke", randomUUID(), "extra"],
			["issue", "extra"],
			["unknown"],
			[],
		];
		for (const args of badUsage) {
			const { code, stdout, stderr } = await runCli(databaseUrl, args);
			expect(code, `${args.join(" ")}: ${stderr}`).toBe(2);
			expect(stdout).toBe("");
			expect(stderr).toContain("Usage:");
		}
	});
});
