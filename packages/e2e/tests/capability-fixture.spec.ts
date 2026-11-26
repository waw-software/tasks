import { type APIRequestContext, expect, test } from "@playwright/test";
import {
	type ServerProcess,
	spawnServer,
	withDatabase,
} from "./support/server.ts";

// Longer than the helpers' own deadlines, so their errors (with the server output) surface.
test.describe.configure({ timeout: 90_000 });

async function healthOf(
	request: APIRequestContext,
	server: ServerProcess,
): Promise<unknown> {
	try {
		const response = await request.get(`${await server.listening()}/health`);
		expect(response.status()).toBe(200);
		return await response.json();
	} finally {
		await server.stop();
	}
}

test("REQ-010 AC-34 serves an explicit empty or selected list", async ({
	request,
}) => {
	for (const capabilities of [[], ["connect", "future-x"]]) {
		await withDatabase(async (databaseUrl) => {
			const server = spawnServer(databaseUrl, undefined, undefined, {
				capabilities,
			});

			expect(await healthOf(request, server)).toEqual({
				apiVersion: 1,
				capabilities,
			});
		});
	}
});

test("REQ-010 AC-34 production ignores the fixture environment", async ({
	request,
}) => {
	await withDatabase(async (databaseUrl) => {
		const server = spawnServer(databaseUrl, undefined, {
			WAW_E2E_CAPABILITIES: '["future-x"]',
		});

		expect(await healthOf(request, server)).toEqual({
			apiVersion: 1,
			capabilities: [],
		});
	});
});
