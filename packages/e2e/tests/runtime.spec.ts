import { expect, test } from "@playwright/test";
import { Client } from "pg";
import { spawnServer, withDatabase } from "./support/server.ts";

// Longer than the helpers' own deadlines, so their errors (with the server output) surface.
test.describe.configure({ timeout: 90_000 });

async function hasPgBossSchema(url: string): Promise<boolean> {
	const client = new Client({ connectionString: url });
	await client.connect();
	try {
		const { rows } = await client.query<{ present: boolean }>(
			"select to_regnamespace('pgboss') is not null as present",
		);
		return rows[0]?.present === true;
	} finally {
		await client.end();
	}
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
