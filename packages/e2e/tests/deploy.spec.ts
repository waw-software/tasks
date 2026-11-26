import { randomBytes } from "node:crypto";
import {
	chmod,
	copyFile,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import {
	type ComposeProject,
	docker,
	removeImage,
	waitForOk,
	withCompose,
} from "./support/deploy.ts";
import { freePort } from "./support/server.ts";
import { setupCodeFrom } from "./support/setup.ts";

const TOKEN_PATTERN = /^waw_dev_[A-Za-z0-9_-]{43}$/;
const PROBE_TAG = "0001_deploy_probe";

function repoPath(path: string): string {
	return fileURLToPath(new URL(`../../../${path}`, import.meta.url));
}

function fixturePath(name: string): string {
	return fileURLToPath(new URL(`fixtures/deploy/${name}`, import.meta.url));
}

// An image build and several container starts in one test.
test.describe.configure({ timeout: 15 * 60_000 });

interface Credential {
	id: string;
	token: string;
}

function parseCredential(output: string): Credential {
	try {
		return JSON.parse(output) as Credential;
	} catch {
		// The parser's message quotes its input, which can hold the token.
		throw new Error("The CLI did not print a JSON credential");
	}
}

/** Issues a device token with the operator CLI in the server container. No assertion echoes it. */
async function issueToken(project: ComposeProject): Promise<Credential> {
	const credential = parseCredential(
		await project.compose([
			"exec",
			"-T",
			"server",
			"node",
			"dist/auth/token-cli.js",
			"issue",
		]),
	);
	expect(TOKEN_PATTERN.test(String(credential.token))).toBe(true);
	return credential;
}

async function expectAuthenticated(
	baseUrl: string,
	credential: Credential,
): Promise<void> {
	const response = await fetch(`${baseUrl}/tokens/current`, {
		headers: { authorization: `Bearer ${credential.token}` },
	});
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ id: credential.id });
}

/**
 * Claims a fresh project with the code from its server log, as the operator does, and
 * proves the access token. No error or assertion echoes the code or a token.
 */
async function claimSetup(
	project: ComposeProject,
	baseUrl: string,
): Promise<void> {
	const code = setupCodeFrom(
		await project.compose(["logs", "--no-log-prefix", "server"]),
	);
	const response = await fetch(`${baseUrl}/setup/claim`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ code }),
	});
	expect(response.status).toBe(201);
	const claimed = (await response.json()) as Record<string, unknown>;
	expect(Object.keys(claimed).sort()).toEqual([
		"accessToken",
		"pairingLink",
		"qrDataUrl",
		"serverUrl",
	]);
	const accessToken = String(claimed.accessToken);
	expect(TOKEN_PATTERN.test(accessToken)).toBe(true);
	const current = await fetch(`${baseUrl}/tokens/current`, {
		headers: { authorization: `Bearer ${accessToken}` },
	});
	expect(current.status).toBe(200);
}

async function query(project: ComposeProject, sql: string): Promise<string> {
	const output = await project.compose([
		"exec",
		"-T",
		"postgres",
		"psql",
		"-U",
		"waw",
		"-d",
		"waw",
		"-tAc",
		sql,
	]);
	return output.trim();
}

async function journalCount(project: ComposeProject): Promise<number> {
	return Number(
		await query(project, "select count(*) from drizzle.__drizzle_migrations"),
	);
}

/** The digest is computed in the container, so the password never leaves it. */
async function passwordDigest(project: ComposeProject): Promise<string> {
	const output = await project.compose([
		"exec",
		"-T",
		"postgres",
		"sha256sum",
		"/run/waw-db/password",
	]);
	const digest = output.split(" ")[0] ?? "";
	expect(/^[0-9a-f]{64}$/.test(digest)).toBe(true);
	return digest;
}

/** The host address of Postgres's port; empty when the command fails. */
async function publishedPostgresPort(project: ComposeProject): Promise<string> {
	try {
		return (await project.compose(["port", "postgres", "5432"])).trim();
	} catch {
		return "";
	}
}

async function imageId(reference: string): Promise<string> {
	const output = await docker([
		"image",
		"inspect",
		"--format",
		"{{.Id}}",
		reference,
	]);
	return output.trim();
}

async function isLocalImage(reference: string): Promise<boolean> {
	return (await docker(["image", "ls", "-q", reference])).trim() !== "";
}

async function serverContainer(project: ComposeProject): Promise<string> {
	return (await project.compose(["ps", "-q", "server"])).trim();
}

/** The reference and the image id of the running server container. */
async function serverImage(
	project: ComposeProject,
): Promise<{ reference: string; id: string }> {
	const output = await docker([
		"inspect",
		"--format",
		"{{.Config.Image}} {{.Image}}",
		await serverContainer(project),
	]);
	const [reference = "", id = ""] = output.trim().split(" ");
	return { reference, id };
}

/** Runs a disposable registry on a free localhost port and removes it with its volume. */
async function withRegistry<T>(
	run: (address: string) => Promise<T>,
): Promise<T> {
	const name = `waw-e2e-registry-${randomBytes(6).toString("hex")}`;
	const address = `127.0.0.1:${await freePort()}`;
	try {
		await docker([
			"run",
			"-d",
			"--name",
			name,
			"-p",
			`${address}:5000`,
			"registry:2",
		]);
		await waitForOk(`http://${address}/v2/`, 60_000);
		return await run(address);
	} finally {
		await docker(["rm", "--force", "--volumes", name]);
	}
}

/** Builds `tag` from the `base` image plus the probe migration and its journal entry. */
async function buildUpdateImage(tag: string, base: string): Promise<void> {
	const journal = JSON.parse(
		await readFile(
			repoPath("apps/core-server/migrations/meta/_journal.json"),
			"utf8",
		),
	) as { entries: { idx: number }[] };
	const last = journal.entries.at(-1);
	if (!last) {
		throw new Error("The baseline migration journal has no entry");
	}
	const entries = [
		...journal.entries,
		{
			idx: last.idx + 1,
			version: "7",
			when: Date.now(),
			tag: PROBE_TAG,
			breakpoints: true,
		},
	];

	const context = await mkdtemp(join(tmpdir(), "waw-e2e-deploy-"));
	try {
		const migration = join(context, `${PROBE_TAG}.sql`);
		const journalCopy = join(context, "_journal.json");
		await copyFile(fixturePath(`${PROBE_TAG}.sql`), migration);
		await writeFile(journalCopy, JSON.stringify({ ...journal, entries }));
		// COPY keeps the mode, and the server's user must read both files.
		// Unlike a mode set on creation, chmod is not narrowed by the umask.
		await chmod(migration, 0o644);
		await chmod(journalCopy, 0o644);
		await docker([
			"build",
			"--file",
			fixturePath("Dockerfile"),
			"--build-arg",
			`BASE=${base}`,
			"--tag",
			tag,
			context,
		]);
	} finally {
		await rm(context, { recursive: true, force: true });
	}
}

test("REQ-011 AC-37 REQ-011 AC-39 starts the server and Postgres from the compose file with no configuration", async () => {
	await withCompose(async (project) => {
		// A plain `up` has to build the checkout: nothing holds this image yet.
		expect(await isLocalImage(project.image)).toBe(false);
		await project.compose(["up", "-d", "--wait"]);
		const baseUrl = await project.waitHealthy();

		const health = await fetch(`${baseUrl}/health`);
		expect(health.status).toBe(200);
		expect(await health.json()).toEqual({
			apiVersion: 1,
			capabilities: ["connect"],
		});

		const fresh = await fetch(`${baseUrl}/`, { redirect: "manual" });
		expect(fresh.status).toBe(302);
		expect(fresh.headers.get("location")).toBe("/setup");
		await claimSetup(project, baseUrl);

		const shell = await fetch(`${baseUrl}/`, { redirect: "manual" });
		expect(shell.status).toBe(200);
		const html = await shell.text();
		expect(html).toContain("WAW Tasks");

		const asset = /assets\/[^"'\s]+\.js/.exec(html)?.[0];
		expect(asset).toBeDefined();
		const script = await fetch(`${baseUrl}/${asset}`);
		expect(script.status).toBe(200);
		expect(script.headers.get("content-type")).toContain("javascript");
		await script.body?.cancel();

		// Compose versions that do not fail for an unpublished port print an empty address.
		expect(await publishedPostgresPort(project)).toMatch(
			/^(|:0|invalid IP:0)$/,
		);

		const uid = (
			await project.compose(["exec", "-T", "server", "id", "-u"])
		).trim();
		expect(uid).toMatch(/^[1-9]\d*$/);

		const credential = await issueToken(project);
		await expectAuthenticated(baseUrl, credential);
		expect(await journalCount(project)).toBeGreaterThanOrEqual(1);
		expect(
			await query(project, "select to_regnamespace('pgboss') is not null"),
		).toBe("t");

		const password = await passwordDigest(project);
		await withCompose(async (other) => {
			await other.compose(["up", "-d", "--wait", "postgres"]);
			expect((await passwordDigest(other)) === password).toBe(false);
		});

		const container = await serverContainer(project);
		await project.compose(["stop", "server"]);
		const exitCode = await docker([
			"inspect",
			"--format",
			"{{.State.ExitCode}}",
			container,
		]);
		expect(exitCode.trim()).toBe("0");

		await project.compose(["down"]);
		await project.compose(["up", "-d", "--wait"]);
		await expectAuthenticated(await project.waitHealthy(), credential);
		expect((await passwordDigest(project)) === password).toBe(true);
	});
});

test("REQ-011 AC-38 updates by pull and up, applies the pending migration and keeps the data", async () => {
	await withRegistry(async (registry) => {
		const updateImage = `${registry}/waw-tasks-server:update`;
		try {
			await withCompose(async (project) => {
				await project.compose(["build"]);
				await project.compose(["up", "-d", "--wait"]);
				const credential = await issueToken(project);
				await expectAuthenticated(await project.waitHealthy(), credential);
				const applied = await journalCount(project);
				const baseline = await serverImage(project);
				expect(baseline.reference).toBe(project.image);

				await buildUpdateImage(updateImage, project.image);
				await docker(["push", updateImage]);
				await docker(["image", "rm", updateImage]);
				expect(await isLocalImage(updateImage)).toBe(false);

				const update = { WAW_SERVER_IMAGE: updateImage };
				await project.compose(["pull", "server"], update);
				await project.compose(["up", "-d", "--wait"], update);
				const baseUrl = await project.waitHealthy();

				const running = await serverImage(project);
				expect(running).toEqual({
					reference: updateImage,
					id: await imageId(updateImage),
				});
				expect(running.id).not.toBe(baseline.id);
				expect(await journalCount(project)).toBe(applied + 1);
				expect(
					await query(
						project,
						"select to_regclass('public.deploy_probe') is not null",
					),
				).toBe("t");
				await expectAuthenticated(baseUrl, credential);
			});
		} finally {
			// After the project is down, so no container holds the image.
			await removeImage(updateImage);
		}
	});
});
