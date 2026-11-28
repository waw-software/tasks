import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopConnection } from "./connection";
import {
	type FakeRoute,
	fakeServer,
	HEALTH_FULL,
	HEALTH_OLD,
	MINTED,
	memoryStore,
	ORIGIN,
	OWNER_TOKEN,
} from "./connection.fakes";
import type { CredentialStore } from "./types";

const DEVICE_ID = "22222222-2222-4222-8222-222222222222";
const STORED = { serverUrl: ORIGIN, token: MINTED.token, limitedAck: null };
const MANUAL = {
	kind: "manual",
	serverUrl: ORIGIN,
	token: OWNER_TOKEN,
} as const;
const REVOKE_ROUTE = `DELETE /tokens/${DEVICE_ID}`;
const SIGNED_OUT = { ok: true, value: null };
const UNREACHABLE = { ok: false, error: "unreachable" };
const NO_CREDENTIAL = { ok: false, error: "unauthorized" };
const SAVED_VIEW = {
	serverUrl: ORIGIN,
	health: HEALTH_FULL,
	persisted: true,
	limitedAccepted: false,
};

function healthyRoutes(): Record<string, FakeRoute> {
	return {
		"GET /health": { status: 200, body: HEALTH_FULL },
		"GET /tokens/current": { status: 200, body: { id: DEVICE_ID } },
		"POST /tokens": { status: 201, body: MINTED },
		[REVOKE_ROUTE]: { status: 204 },
	};
}

function savedStore() {
	return memoryStore({ kind: "found", connection: STORED });
}

function setup(store = savedStore()) {
	const routes = healthyRoutes();
	const server = fakeServer(routes);
	const connect = (over: CredentialStore = store) =>
		createDesktopConnection({ store: over, transport: server.transport });
	return { connection: connect(), connect, routes, server, store };
}

/** A connection whose credential could not be saved; the request log starts empty. */
async function memoryOnly() {
	const store = memoryStore();
	store.failWrites = true;
	const context = setup(store);
	expect(await context.connection.submit(MANUAL)).toMatchObject({
		ok: true,
		value: { persisted: false },
	});
	context.server.requests.length = 0;
	return context;
}

/** Each request with the secret it carried. */
function calls(
	requests: {
		method: string;
		url: string;
		headers: Record<string, string>;
	}[],
): string[] {
	return requests.map(
		({ method, url, headers }) => `${method} ${url} ${headers.authorization}`,
	);
}

const REVOKE_CALLS = [
	`GET ${ORIGIN}/tokens/current Bearer ${MINTED.token}`,
	`DELETE ${ORIGIN}/tokens/${DEVICE_ID} Bearer ${MINTED.token}`,
];

describe("createDesktopConnection: session", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("REQ-007 AC-28: load restores a saved connection", async () => {
		const { connection, server, store } = setup();

		const result = await connection.load();

		expect(result).toEqual({ ok: true, value: SAVED_VIEW });
		expect(calls(server.requests)).toEqual([
			`GET ${ORIGIN}/tokens/current Bearer ${MINTED.token}`,
			`GET ${ORIGIN}/health undefined`,
		]);
		expect(store.file()).toEqual(STORED);
		expect(store.writes).toEqual([]);
		expect(store.clears).toBe(0);
	});

	it("REQ-007 AC-28: a revoked token is forgotten and load shows Connect", async () => {
		const { connection, routes, store } = setup();
		routes["GET /tokens/current"] = { status: 401 };

		const result = await connection.load();

		expect(result).toEqual(SIGNED_OUT);
		expect(store.file()).toBeNull();
		expect(store.clears).toBe(1);
		expect(await connection.recheck()).toEqual(NO_CREDENTIAL);
	});

	it("REQ-007 AC-28: an unreachable server keeps the connection", async () => {
		const { connection, routes, store } = setup();
		routes["GET /tokens/current"] = "throw";

		const result = await connection.load();

		expect(result).toEqual(UNREACHABLE);
		expect(store.file()).toEqual(STORED);
		expect(store.clears).toBe(0);
		Object.assign(routes, healthyRoutes());
		expect(await connection.recheck()).toEqual({
			ok: true,
			value: SAVED_VIEW,
		});
	});

	it("REQ-007 AC-28: a keyring that is unavailable now shows Connect and keeps the record", async () => {
		const { connection, server, store } = setup(
			memoryStore({ kind: "unavailable" }),
		);

		const result = await connection.load();

		expect(result).toEqual(SIGNED_OUT);
		expect(store.clears).toBe(0);
		expect(store.writes).toEqual([]);
		expect(await store.read()).toEqual({ kind: "unavailable" });
		expect(server.requests).toEqual([]);
	});

	it("REQ-007 AC-28: sign-out revokes the saved device and forgets it", async () => {
		const { connection, server, store } = setup();
		expect(await connection.load()).toMatchObject({ ok: true });
		server.requests.length = 0;

		const result = await connection.signOut();

		expect(result).toEqual(SIGNED_OUT);
		expect(calls(server.requests)).toEqual(REVOKE_CALLS);
		expect(store.file()).toBeNull();
		expect(await connection.recheck()).toEqual(NO_CREDENTIAL);
		expect(server.requests).toHaveLength(2);
	});

	it("REQ-007 AC-28: sign-out revokes a memory-only device too", async () => {
		const { connection, server, store } = await memoryOnly();
		const clearsAfterFailedSave = store.clears;

		const result = await connection.signOut();

		expect(result).toEqual(SIGNED_OUT);
		expect(calls(server.requests)).toEqual(REVOKE_CALLS);
		expect(store.clears).toBe(clearsAfterFailedSave);
		expect(await connection.recheck()).toEqual(NO_CREDENTIAL);
		expect(server.requests).toHaveLength(2);
	});

	it("REQ-007 AC-28: sign-out while the server is unreachable keeps the connection", async () => {
		const { connection, routes, server, store } = setup();
		expect(await connection.load()).toMatchObject({ ok: true });

		// The server drops before the device is read, then between that and the revoke.
		for (const route of ["GET /tokens/current", REVOKE_ROUTE]) {
			Object.assign(routes, healthyRoutes(), { [route]: "throw" });

			expect(await connection.signOut()).toEqual(UNREACHABLE);
			expect(store.file()).toEqual(STORED);
			expect(store.clears).toBe(0);
		}

		Object.assign(routes, healthyRoutes());
		server.requests.length = 0;
		expect(await connection.load()).toEqual({ ok: true, value: SAVED_VIEW });
		expect(calls(server.requests)).toEqual([
			`GET ${ORIGIN}/tokens/current Bearer ${MINTED.token}`,
			`GET ${ORIGIN}/health undefined`,
		]);
	});

	it("REQ-007 AC-28: recheck of a revoked token forgets it and is unauthorized", async () => {
		const { connection, routes, store } = setup();
		expect(await connection.load()).toMatchObject({ ok: true });
		routes["GET /tokens/current"] = { status: 401 };

		const result = await connection.recheck();

		expect(result).toEqual(NO_CREDENTIAL);
		expect(store.file()).toBeNull();
		expect(await connection.load()).toEqual(SIGNED_OUT);
	});

	it.each<{
		refused: string;
		routes: Record<string, FakeRoute>;
		requests: string[];
	}>([
		{
			refused: "when the device is read",
			routes: { "GET /tokens/current": { status: 401 } },
			requests: REVOKE_CALLS.slice(0, 1),
		},
		{
			refused: "on the revoke",
			routes: { [REVOKE_ROUTE]: { status: 401 } },
			requests: REVOKE_CALLS,
		},
	])(
		"REQ-007 AC-28: sign-out forgets a token the server already refused $refused",
		async (refusal) => {
			const { connection, routes, server, store } = setup();
			expect(await connection.load()).toMatchObject({ ok: true });
			Object.assign(routes, refusal.routes);
			server.requests.length = 0;

			const result = await connection.signOut();

			expect(result).toEqual(SIGNED_OUT);
			expect(calls(server.requests)).toEqual(refusal.requests);
			expect(store.file()).toBeNull();
			expect(await connection.recheck()).toEqual(NO_CREDENTIAL);
		},
	);

	it("REQ-010 AC-35: a limited choice that cannot be saved keeps the connection for this run only", async () => {
		const { connection, connect, routes, store } = setup();
		routes["GET /health"] = { status: 200, body: HEALTH_OLD };
		const accepted = {
			ok: true,
			value: {
				...SAVED_VIEW,
				health: HEALTH_OLD,
				persisted: false,
				limitedAccepted: true,
			},
		};
		expect(await connection.load()).toMatchObject({ ok: true });
		store.failWrites = true;

		const result = await connection.acknowledgeLimited();

		expect(result).toEqual(accepted);
		expect(store.file()).toBeNull();
		expect(await connection.recheck()).toEqual(accepted);
		expect(await connect().load()).toEqual(SIGNED_OUT);
	});

	it("REQ-007 AC-28: a removal that fails is reported once and the connection carries on", async () => {
		const store = savedStore();
		store.failWrites = true;
		store.failClears = true;
		const reports: unknown[][] = [];
		const connection = createDesktopConnection({
			store,
			transport: fakeServer(healthyRoutes()).transport,
			onStoreProblem: (...args) => {
				reports.push(args);
			},
		});
		const memoryView = { ok: true, value: { ...SAVED_VIEW, persisted: false } };

		const result = await connection.submit(MANUAL);

		expect(result).toEqual(memoryView);
		expect(await connection.recheck()).toEqual(memoryView);
		// The whole argument list: nothing else, so no token and no path.
		expect(reports).toStrictEqual([["clear-failed"]]);
	});

	it("REQ-010 AC-35: each fresh health decides the update; only the limited choice survives", async () => {
		const { connection, connect, routes, store } = setup();
		routes["GET /health"] = { status: 200, body: HEALTH_OLD };
		const oldView = { ...SAVED_VIEW, health: HEALTH_OLD };
		const accepted = {
			ok: true,
			value: { ...oldView, limitedAccepted: true },
		};

		expect(await connection.load()).toEqual({ ok: true, value: oldView });
		expect(await connection.acknowledgeLimited()).toEqual(accepted);
		expect(await connection.recheck()).toEqual(accepted);
		expect(store.file()).toEqual({
			...STORED,
			limitedAck: { serverUrl: ORIGIN, capabilityKey: "[]" },
		});

		const relaunched = connect();
		expect(await relaunched.load()).toEqual(accepted);

		routes["GET /health"] = { status: 200, body: HEALTH_FULL };
		expect(await relaunched.recheck()).toEqual({
			ok: true,
			value: SAVED_VIEW,
		});
		expect(store.file()).toEqual(STORED);

		// A dropped choice does not come back with the old capability set.
		routes["GET /health"] = { status: 200, body: HEALTH_OLD };
		expect(await connect().load()).toEqual({ ok: true, value: oldView });
	});

	it("REQ-010 AC-35: acknowledging without a checked server is refused", async () => {
		const { connection, routes, store } = setup();
		const refused = { ok: false, error: "invalid-response" };

		// Nothing loaded yet.
		expect(await connection.acknowledgeLimited()).toEqual(refused);

		// A saved credential whose server has not answered /health in this run.
		routes["GET /health"] = "throw";
		expect(await connection.load()).toEqual(UNREACHABLE);
		expect(await connection.acknowledgeLimited()).toEqual(refused);
		expect(store.writes).toEqual([]);
		expect(store.file()).toEqual(STORED);
	});

	it("REQ-007 AC-28: a write racing a sign-out ends signed out", async () => {
		const { connect, store } = setup();
		const events: string[] = [];
		const connection = connect({
			read: () => store.read(),
			write: async (record) => {
				events.push("write started");
				await store.write(record);
				events.push("write finished");
			},
			clear: async () => {
				events.push("clear");
				await store.clear();
			},
		});
		expect(await connection.load()).toMatchObject({ ok: true });

		const [acknowledged, signedOut] = await Promise.all([
			connection.acknowledgeLimited(),
			connection.signOut(),
		]);

		expect(acknowledged).toEqual({
			ok: true,
			value: { ...SAVED_VIEW, limitedAccepted: true },
		});
		expect(signedOut).toEqual(SIGNED_OUT);
		expect(events).toEqual(["write started", "write finished", "clear"]);
		expect(store.file()).toBeNull();
		expect(await connection.recheck()).toEqual(NO_CREDENTIAL);
	});

	it("REQ-007 AC-28: a clean quit revokes a memory-only credential within the time limit", async () => {
		// A server that answers: the device is revoked.
		const answering = await memoryOnly();
		await answering.connection.discard(50);
		expect(calls(answering.server.requests)).toEqual(REVOKE_CALLS);
		expect(await answering.connection.recheck()).toEqual(NO_CREDENTIAL);

		// A server that never answers: discard resolves once the limit has passed.
		const silent = await memoryOnly();
		silent.routes["GET /tokens/current"] = "hang";
		vi.useFakeTimers();
		let outcome = "pending";
		silent.connection.discard(50).then(
			() => {
				outcome = "resolved";
			},
			() => {
				outcome = "rejected";
			},
		);
		await vi.advanceTimersByTimeAsync(50);
		expect(outcome).toBe("resolved");
		expect(await silent.connection.recheck()).toEqual(NO_CREDENTIAL);
		vi.useRealTimers();

		// A saved credential is left alone.
		const saved = setup();
		expect(await saved.connection.load()).toMatchObject({ ok: true });
		saved.server.requests.length = 0;
		await saved.connection.discard(50);
		expect(saved.server.requests).toEqual([]);
		expect(saved.store.file()).toEqual(STORED);
		expect(saved.store.clears).toBe(0);
	});
});
