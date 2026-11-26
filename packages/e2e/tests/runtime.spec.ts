import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { spawnServer, withDatabase, withRole } from "./support/server.ts";

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

async function hasPgBossSchema(url: string): Promise<boolean> {
	return withClient(url, async (client) => {
		const { rows } = await client.query<{ present: boolean }>(
			"select to_regnamespace('pgboss') is not null as present",
		);
		return rows[0]?.present === true;
	});
}

test("REQ-011 AC-38 runs the worker inside the server before it listens", async () => {
	await withDatabase(async (url) => {
		expect(await hasPgBossSchema(url)).toBe(false);
		const server = spawnServer(url);
		try {
			await server.listening();
			expect(await hasPgBossSchema(url)).toBe(true);
		} finally {
			await server.stop();
		}
		expect(await server.exited()).toBe(0);
	});
});

test("REQ-011 AC-38 exits non-zero without listening when the worker fails to start", async () => {
	// The role outlives the database it owns.
	await withRole(async (role) => {
		await withDatabase(async (adminUrl) => {
			const url = new URL(adminUrl);
			// The role owns the database, so migrations pass. pg-boss installs into the
			// schema "pgboss", which stays the admin's: the role cannot create in it.
			await withClient(adminUrl, async (client) => {
				await client.query(
					`ALTER DATABASE ${url.pathname.slice(1)} OWNER TO ${role.name}`,
				);
				await client.query("CREATE SCHEMA pgboss");
				await client.query("REVOKE ALL ON SCHEMA pgboss FROM PUBLIC");
			});
			url.username = role.name;
			url.password = role.password;
			const server = spawnServer(url.href);
			try {
				const code = await server.exited();
				expect(code).toEqual(expect.any(Number));
				expect(code).not.toBe(0);
				expect(server.output()).toContain("worker failed to start");
				expect(server.output()).not.toContain("Server listening");
			} finally {
				await server.stop();
			}
			await withClient(adminUrl, async (client) => {
				const { rows } = await client.query<{ present: boolean }>(
					"select to_regclass('public.device_tokens') is not null as present",
				);
				expect(rows[0]?.present).toBe(true);
			});
		});
	});
});
