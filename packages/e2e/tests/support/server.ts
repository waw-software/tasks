import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const root = fileURLToPath(new URL("../../../..", import.meta.url));

const LISTEN_LINE = /"msg":"Server listening at (http:\/\/127\.0\.0\.1:\d+)"/;

function adminDatabaseUrl(): string {
	const adminUrl = process.env.DATABASE_URL;
	if (!adminUrl) {
		throw new Error("DATABASE_URL is not set");
	}
	return adminUrl;
}

function disposableName(): string {
	return `waw_e2e_${randomBytes(6).toString("hex")}`;
}

async function withAdmin<T>(run: (admin: Client) => Promise<T>): Promise<T> {
	const admin = new Client({ connectionString: adminDatabaseUrl() });
	await admin.connect();
	try {
		return await run(admin);
	} finally {
		await admin.end();
	}
}

/** Creates database waw_e2e_<12 hex>, runs `run` with its URL, then drops it (WITH (FORCE)). Admin URL: process.env.DATABASE_URL. */
export async function withDatabase<T>(
	run: (url: string) => Promise<T>,
): Promise<T> {
	const name = disposableName();
	const url = new URL(adminDatabaseUrl());
	url.pathname = `/${name}`;

	return withAdmin(async (admin) => {
		await admin.query(`CREATE DATABASE ${name}`);
		try {
			return await run(url.href);
		} finally {
			await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
		}
	});
}

/** Creates login role waw_e2e_<12 hex> with a password of its own, runs `run`, then drops it. Drop what it owns inside `run`. */
export async function withRole<T>(
	run: (role: { name: string; password: string }) => Promise<T>,
): Promise<T> {
	const name = disposableName();
	const password = `e2e-migrate-pw-${randomBytes(6).toString("hex")}`;

	return withAdmin(async (admin) => {
		await admin.query(`CREATE ROLE ${name} LOGIN PASSWORD '${password}'`);
		try {
			return await run({ name, password });
		} finally {
			await admin.query(`DROP ROLE ${name}`);
		}
	});
}

/** A TCP port that was free a moment ago (listen on 0, read, close). */
export async function freePort(): Promise<number> {
	const probe = createServer();
	probe.listen(0, "127.0.0.1");
	await once(probe, "listening");
	const address = probe.address();
	probe.close();
	await once(probe, "close");
	if (address === null || typeof address === "string") {
		throw new Error("The probe socket has no TCP port");
	}
	return address.port;
}

export interface ServerProcess {
	/** Everything the child wrote to stdout and stderr so far. */
	output(): string;
	/** Resolves with "http://127.0.0.1:<port>" at the listen log line; rejects if the child exits first or after timeoutMs (default 30_000). */
	listening(timeoutMs?: number): Promise<string>;
	/** Resolves with the exit code when the child exits; rejects after timeoutMs (default 30_000). */
	exited(timeoutMs?: number): Promise<number | null>;
	/** SIGTERM, wait up to 10 s, then SIGKILL; resolves when the child is gone. */
	stop(): Promise<void>;
}

function withDeadline<T>(
	promise: Promise<T>,
	timeoutMs: number,
	message: () => string,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(message())), timeoutMs);
		promise.then(resolve, reject).finally(() => clearTimeout(timer));
	});
}

/** Spawns node apps/core-server/dist/index.js with DATABASE_URL, HOST=127.0.0.1, PORT=port ?? 0 and the rest of process.env; extraEnv wins over all of these, and an undefined value removes the variable. */
export function spawnServer(
	databaseUrl: string,
	port?: number,
	extraEnv?: NodeJS.ProcessEnv,
): ServerProcess {
	const child = spawn(process.execPath, ["apps/core-server/dist/index.js"], {
		cwd: root,
		env: {
			...process.env,
			DATABASE_URL: databaseUrl,
			HOST: "127.0.0.1",
			PORT: String(port ?? 0),
			...extraEnv,
		},
		stdio: ["ignore", "pipe", "pipe"],
	});

	let output = "";
	for (const stream of [child.stdout, child.stderr]) {
		stream.setEncoding("utf8");
		stream.on("data", (chunk: string) => {
			output += chunk;
		});
	}

	// "close" follows "exit" once both pipes are drained, so the output is complete.
	const closed = new Promise<number | null>((resolve, reject) => {
		child.once("error", reject);
		child.once("close", (code) => resolve(code));
	});
	// A spawn failure reaches whoever awaits `closed`; this keeps it handled until then.
	closed.catch(() => {});

	const listenUrl = new Promise<string>((resolve, reject) => {
		const read = () => {
			const url = LISTEN_LINE.exec(output)?.[1];
			if (url) {
				child.stdout.off("data", read);
				resolve(url);
			}
		};
		child.stdout.on("data", read);
		closed.then((code) => {
			reject(
				new Error(
					`The server exited with code ${code} before listening:\n${output}`,
				),
			);
		}, reject);
	});
	// Callers that expect a failed start never ask for the listen URL.
	listenUrl.catch(() => {});

	return {
		output: () => output,
		listening: (timeoutMs = 30_000) =>
			withDeadline(
				listenUrl,
				timeoutMs,
				() => `The server did not listen within ${timeoutMs} ms:\n${output}`,
			),
		exited: (timeoutMs = 30_000) =>
			withDeadline(
				closed,
				timeoutMs,
				() => `The server did not exit within ${timeoutMs} ms:\n${output}`,
			),
		async stop() {
			child.kill("SIGTERM");
			const killTimer = setTimeout(() => child.kill("SIGKILL"), 10_000);
			try {
				await closed;
			} finally {
				clearTimeout(killTimer);
			}
		},
	};
}
