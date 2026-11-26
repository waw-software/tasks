import { once } from "node:events";
import { connect } from "node:net";
import { expect, test } from "@playwright/test";
import { Client } from "pg";
import {
	freePort,
	type ServerProcess,
	spawnServer,
	withDatabase,
} from "./support/server.ts";

const MIGRATION_LOCK_KEY = 72_026_113; // apps/core-server/src/db/database.ts

// Longer than the helpers' own deadlines, so their errors (with the server output) surface.
test.describe.configure({ timeout: 90_000 });

async function withClient<T>(
	url: string,
	run: (client: Client) => Promise<T>,
): Promise<T> {
	const client = new Client({ connectionString: url });
	await client.connect();
	try {
		return await run(client);
	} finally {
		await client.end();
	}
}

async function tableExists(client: Client, table: string): Promise<boolean> {
	const { rows } = await client.query<{ present: boolean }>(
		"SELECT to_regclass($1) IS NOT NULL AS present",
		[table],
	);
	return rows[0]?.present === true;
}

async function journalCount(client: Client): Promise<number> {
	const { rows } = await client.query<{ count: number }>(
		"SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations",
	);
	return rows[0]?.count ?? 0;
}

async function expectHealthy(baseUrl: string): Promise<void> {
	const response = await fetch(`${baseUrl}/health`);
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({ apiVersion: 1, capabilities: [] });
}

/** "connected", or the error code of the failed TCP connect. */
async function tcpConnect(port: number): Promise<string | undefined> {
	const socket = connect({ host: "127.0.0.1", port });
	try {
		await once(socket, "connect");
		return "connected";
	} catch (error) {
		return (error as NodeJS.ErrnoException).code;
	} finally {
		socket.destroy();
	}
}

async function expectFailedStart(server: ServerProcess): Promise<void> {
	const code = await server.exited();
	expect(code, server.output()).not.toBe(0);
	expect(server.output()).not.toContain("Server listening");
}

test("REQ-011 AC-38 migrates a fresh database before /health and applies nothing twice on restart", async () => {
	await withDatabase(async (url) => {
		await withClient(url, async (client) => {
			let applied = 0;
			const first = spawnServer(url);
			try {
				await expectHealthy(await first.listening());
				expect(await tableExists(client, "public.device_tokens")).toBe(true);
				applied = await journalCount(client);
				expect(applied).toBeGreaterThanOrEqual(1);
				await client.query(
					"INSERT INTO public.device_tokens (id, token_hash) VALUES (gen_random_uuid(), 'sentinel')",
				);
			} finally {
				await first.stop();
			}

			const second = spawnServer(url);
			try {
				await expectHealthy(await second.listening());
				expect(await journalCount(client)).toBe(applied);
				const { rows } = await client.query(
					"SELECT token_hash FROM public.device_tokens",
				);
				expect(rows).toEqual([{ token_hash: "sentinel" }]);
			} finally {
				await second.stop();
			}
		});
	});
});

test("REQ-011 AC-38 accepts no connection while another session holds the migration lock", async () => {
	await withDatabase(async (url) => {
		await withClient(url, async (client) => {
			await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
			const port = await freePort();
			const server = spawnServer(url, port);
			try {
				await expect
					.poll(
						async () => {
							const { rows } = await client.query<{ count: number }>(
								`SELECT count(*)::int AS count FROM pg_locks
								WHERE locktype = 'advisory' AND NOT granted
								AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`,
							);
							return rows[0]?.count;
						},
						{
							message: "the server waits for the migration lock",
							timeout: 15_000,
						},
					)
					.toBe(1);
				expect(await tcpConnect(port)).toBe("ECONNREFUSED");
				expect(await tableExists(client, "public.device_tokens")).toBe(false);

				await client.query("SELECT pg_advisory_unlock($1)", [
					MIGRATION_LOCK_KEY,
				]);

				await expectHealthy(await server.listening());
				expect(await tableExists(client, "public.device_tokens")).toBe(true);
				expect(await tableExists(client, "drizzle.__drizzle_migrations")).toBe(
					true,
				);
			} finally {
				await server.stop();
			}
		});
	});
});

test("REQ-011 AC-38 exits non-zero without listening when the database is unreachable", async () => {
	const url = `postgres://waw:e2e-unreachable-pw@127.0.0.1:${await freePort()}/waw`;
	const server = spawnServer(url);
	try {
		await expectFailedStart(server);
		expect(server.output()).not.toContain("e2e-unreachable-pw");
	} finally {
		await server.stop();
	}
});

test("REQ-011 AC-38 exits non-zero without listening when a migration fails", async () => {
	await withDatabase(async (url) => {
		// The real migration creates this table, so it fails on the one already there.
		await withClient(url, (client) =>
			client.query("CREATE TABLE public.device_tokens (x int)"),
		);
		const server = spawnServer(url);
		try {
			await expectFailedStart(server);
			expect(server.output()).not.toContain(url);
		} finally {
			await server.stop();
		}
	});
});
