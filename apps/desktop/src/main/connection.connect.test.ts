import { describe, expect, it } from "vitest";
import { createDesktopConnection } from "./connection";
import {
	type FakeRoute,
	fakeServer,
	HEALTH_FULL,
	MINTED,
	memoryStore,
	ORIGIN,
	OWNER_TOKEN,
	PAIRING_LINK,
} from "./connection.fakes";

const OWNER_ID = "22222222-2222-4222-8222-222222222222";
const PAIRING_TOKEN = `waw_pair_${"P".repeat(43)}`;
const STORED = { serverUrl: ORIGIN, token: MINTED.token, limitedAck: null };
const OLD_RECORD = {
	serverUrl: "https://old.example.test",
	token: `waw_dev_${"Q".repeat(43)}`,
	limitedAck: null,
};
const MANUAL = {
	kind: "manual",
	serverUrl: ORIGIN,
	token: OWNER_TOKEN,
} as const;

function healthyRoutes(): Record<string, FakeRoute> {
	return {
		"GET /health": { status: 200, body: HEALTH_FULL },
		"GET /tokens/current": { status: 200, body: { id: OWNER_ID } },
		"POST /tokens": { status: 201, body: MINTED },
		"POST /tokens/pairing/redeem": { status: 201, body: MINTED },
	};
}

function setup(
	routes: Record<string, FakeRoute> = healthyRoutes(),
	store = memoryStore(),
) {
	const server = fakeServer(routes);
	const connection = createDesktopConnection({
		store,
		transport: server.transport,
	});
	return { connection, server, store };
}

function calls(requests: { method: string; url: string }[]): string[] {
	return requests.map(({ method, url }) => `${method} ${url}`);
}

describe("createDesktopConnection: connect", () => {
	it("REQ-007 AC-28: URL and token connect and save the desktop's own minted token", async () => {
		const { connection, server, store } = setup();

		const result = await connection.submit({
			kind: "manual",
			serverUrl: "  https://tasks.example.test/ ",
			token: `  ${OWNER_TOKEN} `,
		});

		expect(result).toEqual({
			ok: true,
			value: {
				serverUrl: ORIGIN,
				health: HEALTH_FULL,
				persisted: true,
				limitedAccepted: false,
			},
		});
		expect(calls(server.requests)).toEqual([
			`GET ${ORIGIN}/health`,
			`GET ${ORIGIN}/tokens/current`,
			`POST ${ORIGIN}/tokens`,
		]);
		expect(server.requests[2]?.headers.authorization).toBe(
			`Bearer ${OWNER_TOKEN}`,
		);
		expect(store.file()).toEqual(STORED);
		expect(store.writes).toEqual([STORED]);
	});

	it("REQ-007 AC-28: a pasted pairing link connects and saves the redeemed token", async () => {
		const { connection, server, store } = setup();

		const result = await connection.submit({
			kind: "pairing",
			link: PAIRING_LINK,
		});

		expect(result).toEqual({
			ok: true,
			value: {
				serverUrl: ORIGIN,
				health: HEALTH_FULL,
				persisted: true,
				limitedAccepted: false,
			},
		});
		expect(calls(server.requests)).toEqual([
			`GET ${ORIGIN}/health`,
			`POST ${ORIGIN}/tokens/pairing/redeem`,
		]);
		expect(JSON.parse(server.requests[1]?.body ?? "null")).toEqual({
			token: PAIRING_TOKEN,
		});
		expect(store.file()).toEqual(STORED);
		expect(store.writes).toEqual([STORED]);
	});

	it("REQ-007 AC-28: a used pairing link is refused and nothing is saved", async () => {
		const { connection, store } = setup({
			...healthyRoutes(),
			"POST /tokens/pairing/redeem": { status: 401 },
		});

		const result = await connection.submit({
			kind: "pairing",
			link: PAIRING_LINK,
		});

		expect(result).toEqual({
			ok: false,
			error: "pairing-rejected",
			health: HEALTH_FULL,
		});
		expect(store.writes).toEqual([]);
		expect(store.file()).toBeNull();
	});

	it("REQ-007 AC-28: a refused token is unauthorized and nothing is saved", async () => {
		const { connection, server, store } = setup({
			...healthyRoutes(),
			"GET /tokens/current": { status: 401 },
		});

		const result = await connection.submit(MANUAL);

		expect(result).toEqual({
			ok: false,
			error: "unauthorized",
			health: HEALTH_FULL,
		});
		expect(calls(server.requests)).toEqual([
			`GET ${ORIGIN}/health`,
			`GET ${ORIGIN}/tokens/current`,
		]);
		expect(store.writes).toEqual([]);
		expect(store.file()).toBeNull();
	});

	it("REQ-007 AC-28: a failed mint saves nothing", async () => {
		const { connection, store } = setup({
			...healthyRoutes(),
			"POST /tokens": { status: 500 },
		});

		const result = await connection.submit(MANUAL);

		expect(result).toEqual({ ok: false, error: "invalid-response" });
		expect(store.writes).toEqual([]);
		expect(store.file()).toBeNull();
	});

	it("REQ-007 AC-28: http on a remote host is refused before any request", async () => {
		const { connection, server, store } = setup();

		const result = await connection.submit({
			...MANUAL,
			serverUrl: "http://tasks.example.test",
		});

		expect(result).toEqual({ ok: false, error: "https-required" });
		expect(server.requests).toEqual([]);
		expect(store.writes).toEqual([]);
	});

	it("REQ-007 AC-28: a store that cannot save keeps the connection for this run only and removes the old record", async () => {
		const store = memoryStore({ kind: "found", connection: OLD_RECORD });
		store.failWrites = true;
		const { connection, server } = setup(healthyRoutes(), store);
		const view = {
			serverUrl: ORIGIN,
			health: HEALTH_FULL,
			persisted: false,
			limitedAccepted: false,
		};

		const result = await connection.submit(MANUAL);

		expect(result).toEqual({ ok: true, value: view });
		expect(store.file()).toBeNull();
		expect(await connection.recheck()).toEqual({ ok: true, value: view });

		const requestsBeforeRelaunch = server.requests.length;
		const relaunched = createDesktopConnection({
			store,
			transport: server.transport,
		});
		expect(await relaunched.load()).toEqual({ ok: true, value: null });
		expect(server.requests).toHaveLength(requestsBeforeRelaunch);
	});

	it("REQ-007 AC-28: probe names the server's API version and sends no secret", async () => {
		// A saved credential is active, so a probe could leak it.
		const { connection, server } = setup(
			healthyRoutes(),
			memoryStore({ kind: "found", connection: STORED }),
		);
		expect(await connection.load()).toMatchObject({ ok: true });

		for (const text of ["  https://tasks.example.test/ ", PAIRING_LINK]) {
			server.requests.length = 0;

			const result = await connection.probe(text);

			expect(result).toEqual({
				ok: true,
				value: { serverUrl: ORIGIN, health: HEALTH_FULL },
			});
			expect(calls(server.requests)).toEqual([`GET ${ORIGIN}/health`]);
			const headerNames = Object.keys(server.requests[0]?.headers ?? {}).map(
				(name) => name.toLowerCase(),
			);
			expect(headerNames).not.toContain("authorization");
			expect(headerNames).not.toContain("cookie");
			expect(server.requests[0]?.body).toBeUndefined();
			expect(JSON.stringify(server.requests)).not.toMatch(/waw_(dev|pair)_/);
		}
	});

	it("REQ-007 AC-28: probe refuses an address that is neither a URL nor a pairing link", async () => {
		const { connection, server } = setup();

		const result = await connection.probe("not an address");

		expect(result).toEqual({ ok: false, error: "invalid-address" });
		expect(server.requests).toEqual([]);
	});
});
