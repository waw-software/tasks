import { execFile } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { once } from "node:events";
import {
	type IncomingHttpHeaders,
	type IncomingMessage,
	request,
} from "node:http";
import { text } from "node:stream/consumers";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { spawnServer, withDatabase } from "./support/server.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));

const DEVICE_TOKEN_PATTERN = /^waw_dev_[A-Za-z0-9_-]{43}$/;
const PAIRING_TOKEN_PATTERN = /^waw_pair_[A-Za-z0-9_-]{43}$/;

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

// Longer than the helpers' own deadlines, so their errors (with the server output) surface.
test.describe.configure({ timeout: 90_000 });

interface Credential {
	id: string;
	token: string;
}

interface Pairing {
	pairingLink: string;
	expiresAt: string;
}

/** Issues a device token with the compiled operator CLI; a non-zero exit rejects. */
async function issueWithCli(databaseUrl: string): Promise<Credential> {
	const { stdout } = await promisify(execFile)(
		process.execPath,
		["apps/core-server/dist/auth/token-cli.js", "issue"],
		{
			cwd: root,
			env: { ...process.env, DATABASE_URL: databaseUrl },
			timeout: 30_000,
		},
	);
	const credential = JSON.parse(stdout) as Credential;
	expect(credential.token).toMatch(DEVICE_TOKEN_PATTERN);
	return credential;
}

/** Runs a server with PUBLIC_URL set to `publicUrl`, or unset whatever the caller's environment holds. */
async function withServer(
	run: (baseUrl: string, databaseUrl: string) => Promise<void>,
	publicUrl?: string,
): Promise<void> {
	await withDatabase(async (databaseUrl) => {
		const server = spawnServer(databaseUrl, undefined, {
			PUBLIC_URL: publicUrl,
		});
		try {
			await run(await server.listening(), databaseUrl);
		} finally {
			await server.stop();
		}
	});
}

async function withClient<T>(
	databaseUrl: string,
	run: (client: Client) => Promise<T>,
): Promise<T> {
	const client = new Client({ connectionString: databaseUrl });
	await client.connect();
	try {
		return await run(client);
	} finally {
		await client.end();
	}
}

function bearer(token: string): Record<string, string> {
	return { authorization: `Bearer ${token}` };
}

function digest(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

/** POST /tokens/pairing over node:http, which sends a caller's Host header as given. */
async function postPairing(
	baseUrl: string,
	headers: Record<string, string>,
): Promise<{ status: number; headers: IncomingHttpHeaders; body: string }> {
	const outgoing = request(`${baseUrl}/tokens/pairing`, {
		method: "POST",
		headers,
		signal: AbortSignal.timeout(30_000),
	});
	outgoing.end();
	const [response] = (await once(outgoing, "response")) as [IncomingMessage];
	return {
		status: response.statusCode ?? 0,
		headers: response.headers,
		body: await text(response),
	};
}

async function issuePairing(
	baseUrl: string,
	device: Credential,
): Promise<Pairing> {
	const response = await fetch(`${baseUrl}/tokens/pairing`, {
		method: "POST",
		headers: bearer(device.token),
	});
	expect(response.status).toBe(201);
	return (await response.json()) as Pairing;
}

function pairingToken({ pairingLink }: Pairing): string {
	const token = new URLSearchParams(new URL(pairingLink).hash.slice(1)).get(
		"token",
	);
	expect(token).toMatch(PAIRING_TOKEN_PATTERN);
	return token as string;
}

function redeem(baseUrl: string, token: string): Promise<Response> {
	return fetch(`${baseUrl}/tokens/pairing/redeem`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ token }),
	});
}

async function expectUnauthorized(response: Response): Promise<void> {
	expect(response.status).toBe(401);
	expect(await response.json()).toEqual({ error: "unauthorized" });
}

/** The id the server knows a device token by. */
async function currentId(baseUrl: string, token: string): Promise<string> {
	const response = await fetch(`${baseUrl}/tokens/current`, {
		headers: bearer(token),
	});
	expect(response.status).toBe(200);
	return ((await response.json()) as { id: string }).id;
}

test("REQ-011 AC-39 issues a one-hour pairing link from the request origin", async () => {
	await withServer(async (baseUrl, databaseUrl) => {
		const device = await issueWithCli(databaseUrl);
		const origin = {
			host: "tasks.example.test",
			"x-forwarded-proto": "https",
		};

		const before = Date.now();
		const response = await postPairing(baseUrl, {
			...origin,
			...bearer(device.token),
		});
		const after = Date.now();

		expect(response.status, response.body).toBe(201);
		expect(response.headers["cache-control"]).toContain("no-store");
		const first = JSON.parse(response.body) as Pairing;
		expect(Object.keys(first).sort()).toEqual(["expiresAt", "pairingLink"]);
		expect(first.pairingLink).toMatch(
			/^https:\/\/tasks\.example\.test\/pair#token=waw_pair_[A-Za-z0-9_-]{43}$/,
		);
		const expiresAt = Date.parse(first.expiresAt);
		expect(expiresAt).toBeGreaterThanOrEqual(before + HOUR_MS - MINUTE_MS);
		expect(expiresAt).toBeLessThanOrEqual(after + HOUR_MS + MINUTE_MS);

		// Plain HTTP with no forwarded protocol still gives an HTTPS link.
		const plain = await postPairing(baseUrl, {
			host: origin.host,
			...bearer(device.token),
		});
		expect(plain.status, plain.body).toBe(201);
		expect((JSON.parse(plain.body) as Pairing).pairingLink).toMatch(
			/^https:\/\/tasks\.example\.test\/pair#token=waw_pair_[A-Za-z0-9_-]{43}$/,
		);

		const anonymous = await postPairing(baseUrl, origin);
		expect(anonymous.status).toBe(401);
		expect(JSON.parse(anonymous.body)).toEqual({ error: "unauthorized" });

		const second = await issuePairing(baseUrl, device);
		expect(pairingToken(second)).not.toBe(pairingToken(first));

		// REQ-010 AC-36: pairing leaves /health as it was.
		const health = await fetch(`${baseUrl}/health`);
		expect(health.status).toBe(200);
		expect(await health.json()).toEqual({
			apiVersion: 1,
			capabilities: ["connect"],
		});
	});
});

test("REQ-011 AC-39 uses PUBLIC_URL when it is set", async () => {
	for (const publicUrl of [
		"https://tasks.example.com",
		"http://tasks.example.com",
	]) {
		await withServer(async (baseUrl, databaseUrl) => {
			const device = await issueWithCli(databaseUrl);

			const { pairingLink } = await issuePairing(baseUrl, device);

			expect(pairingLink, publicUrl).toMatch(
				/^https:\/\/tasks\.example\.com\/pair#token=waw_pair_[A-Za-z0-9_-]{43}$/,
			);
		}, publicUrl);
	}
});

test("REQ-011 AC-39 redeems a pairing token exactly once for a working device token", async () => {
	await withServer(async (baseUrl, databaseUrl) => {
		const device = await issueWithCli(databaseUrl);
		const token = pairingToken(await issuePairing(baseUrl, device));

		const redeemed = await redeem(baseUrl, token);
		expect(redeemed.status).toBe(201);
		const paired = (await redeemed.json()) as Credential;
		expect(Object.keys(paired).sort()).toEqual(["id", "token"]);
		expect(paired.token).toMatch(DEVICE_TOKEN_PATTERN);
		expect(paired.token).not.toBe(device.token);
		expect(paired.id).not.toBe(device.id);
		expect(await currentId(baseUrl, paired.token)).toBe(paired.id);

		await expectUnauthorized(await redeem(baseUrl, token));

		const raced = pairingToken(await issuePairing(baseUrl, device));
		const responses = await Promise.all([
			redeem(baseUrl, raced),
			redeem(baseUrl, raced),
		]);
		expect(responses.map((response) => response.status).sort()).toEqual([
			201, 401,
		]);
	});
});

test("REQ-011 AC-39 rejects expired, unknown and wrong-kind tokens", async () => {
	await withServer(async (baseUrl, databaseUrl) => {
		const device = await issueWithCli(databaseUrl);

		const expired = pairingToken(await issuePairing(baseUrl, device));
		await withClient(databaseUrl, async (client) => {
			const { rowCount } = await client.query(
				"UPDATE public.pairing_tokens SET expires_at = now() - interval '1 second' WHERE token_hash = $1",
				[digest(expired)],
			);
			expect(rowCount).toBe(1);
		});
		await expectUnauthorized(await redeem(baseUrl, expired));

		const unknown = `waw_pair_${randomBytes(32).toString("base64url")}`;
		await expectUnauthorized(await redeem(baseUrl, unknown));

		expect((await redeem(baseUrl, device.token)).status).toBe(400);

		const fresh = pairingToken(await issuePairing(baseUrl, device));
		await expectUnauthorized(
			await fetch(`${baseUrl}/tokens/current`, { headers: bearer(fresh) }),
		);
		// It was refused for its kind: as a pairing token it still works.
		expect((await redeem(baseUrl, fresh)).status).toBe(201);
	});
});

test("REQ-011 AC-39 stores only digests of pairing tokens", async () => {
	await withServer(async (baseUrl, databaseUrl) => {
		const device = await issueWithCli(databaseUrl);
		const token = pairingToken(await issuePairing(baseUrl, device));

		const rows = await withClient(databaseUrl, async (client) => {
			const result = await client.query<{ token_hash: string }>(
				"SELECT * FROM public.pairing_tokens",
			);
			return result.rows;
		});

		expect(rows.map((row) => row.token_hash)).toEqual([digest(token)]);
		// Neither the whole token nor its secret part, in any column.
		expect(JSON.stringify(rows)).not.toContain(token.slice("waw_pair_".length));
	});
});

test("fails startup on an invalid PUBLIC_URL", async () => {
	await withDatabase(async (databaseUrl) => {
		const server = spawnServer(databaseUrl, undefined, {
			PUBLIC_URL: "https://x.example/path",
		});
		try {
			expect(await server.exited(), server.output()).toBe(1);
			expect(server.output()).not.toContain("Server listening");
		} finally {
			await server.stop();
		}
	});
});
