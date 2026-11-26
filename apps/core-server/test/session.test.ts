import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { loggerOptions } from "../src/auth/device-auth.js";
import { type AppDb, hashDeviceToken } from "../src/auth/device-store.js";
import { publicAddressTrustProxy } from "../src/public-url.js";

const ownerId = "3f1c2a9e-5b7d-4c1a-9e2f-8a6b4d0c7e15";
const browserId = "9b2e4d71-0c3a-4f58-8d16-2a7c5e9b1f04";
const ownerToken = `waw_dev_${"A".repeat(43)}`;
const browserToken = `waw_ses_${"B".repeat(43)}`;
const revokedToken = `waw_ses_${"C".repeat(43)}`;
const cookie = `waw_session=${browserToken}`;
const loopbackHost = "127.0.0.1:3000";
const origin = `http://${loopbackHost}`;
const cleared = "waw_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict";

interface Inserted {
	id: string;
	tokenHash: string;
}

/** A database with the owner and one browser device, which records inserts and revocations. */
function fakeDb(options: { failRevoke?: boolean } = {}) {
	const dialect = new PgDialect();
	const params = (condition: SQL) => dialect.sqlToQuery(condition).params;
	const active = new Map([
		[hashDeviceToken(ownerToken), ownerId],
		[hashDeviceToken(browserToken), browserId],
	]);
	const inserts: Inserted[] = [];
	const revocations: string[] = [];
	const lookups: string[] = [];

	const db = {
		select: () => ({
			from: () => ({
				where: (condition: SQL) => ({
					limit: async () => {
						const [digest] = params(condition);
						lookups.push(digest as string);
						const id = active.get(digest as string);
						return id ? [{ id }] : [];
					},
				}),
			}),
		}),
		insert: () => ({
			values: async (row: Inserted) => {
				inserts.push(row);
				// An issued token is live, so a later request can use it.
				active.set(row.tokenHash, row.id);
			},
		}),
		update: () => ({
			set: () => ({
				where: async (condition: SQL) => {
					if (options.failRevoke) throw new Error("connection lost");
					const [id] = params(condition);
					revocations.push(id as string);
					for (const [digest, device] of active) {
						if (device === id) active.delete(digest);
					}
				},
			}),
		}),
	};
	return { db: db as unknown as AppDb, inserts, revocations, lookups };
}

describe("browser session", () => {
	let server: FastifyInstance | undefined;

	afterEach(async () => {
		await server?.close();
		server = undefined;
	});

	async function start(db: AppDb): Promise<FastifyInstance> {
		server = Fastify({ trustProxy: publicAddressTrustProxy });
		await server.register(app, { db });
		return server;
	}

	/** An undefined header value leaves that header out. */
	function session(
		target: FastifyInstance,
		method: "POST" | "DELETE",
		headers: Record<string, string | undefined> = {},
	) {
		const all = { host: loopbackHost, origin, ...headers };
		return target.inject({
			method,
			url: "/session",
			remoteAddress: "127.0.0.1",
			headers: Object.fromEntries(
				Object.entries(all).filter(([, value]) => value !== undefined),
			) as Record<string, string>,
		});
	}

	const bearer = { authorization: `Bearer ${ownerToken}` };

	it("REQ-007 AC-28 mints a separate device and only sets its token in the cookie", async () => {
		const { db, inserts } = fakeDb();
		const target = await start(db);

		const res = await session(target, "POST", bearer);

		expect(res.statusCode).toBe(201);
		expect(res.headers["cache-control"]).toBe("no-store");
		const header = String(res.headers["set-cookie"]);
		const parts =
			/^waw_session=(waw_ses_[A-Za-z0-9_-]{43}); Path=\/; Max-Age=34560000; HttpOnly; SameSite=Strict$/.exec(
				header,
			);
		const issued = parts?.[1] ?? "";
		expect(issued, header).not.toBe("");
		expect(issued).not.toBe(ownerToken);
		expect(inserts).toEqual([
			{ id: expect.any(String), tokenHash: hashDeviceToken(issued) },
		]);
		expect(res.json()).toEqual({ id: inserts[0]?.id });
		expect(inserts[0]?.id).not.toBe(ownerId);
		expect(res.body).not.toContain("waw_ses_");
	});

	it("REQ-007 AC-28 marks the cookie Secure behind a trusted https proxy", async () => {
		const target = await start(fakeDb().db);

		const res = await session(target, "POST", {
			...bearer,
			host: "tasks.example.com",
			origin: "https://tasks.example.com",
			"x-forwarded-proto": "https",
		});

		expect(res.statusCode).toBe(201);
		expect(res.headers["set-cookie"]).toMatch(/; SameSite=Strict; Secure$/);
	});

	it("REQ-007 AC-28 the browser session token is refused as a Bearer token", async () => {
		const { db, inserts, lookups } = fakeDb();
		const target = await start(db);
		const login = await session(target, "POST", bearer);
		const issued =
			/^waw_session=([^;]+)/.exec(String(login.headers["set-cookie"]))?.[1] ??
			"";
		expect(issued).not.toBe("");
		const lookupsAfterLogin = lookups.length;

		for (const [method, url] of [
			["POST", "/tokens"],
			["POST", "/tokens/pairing"],
			["GET", "/tokens/current"],
		] as const) {
			const res = await target.inject({
				method,
				url,
				headers: { host: loopbackHost, authorization: `Bearer ${issued}` },
			});

			expect(res.statusCode, `${method} ${url}`).toBe(401);
		}
		// Only the login inserted, and no refused request reached the database.
		expect(inserts).toHaveLength(1);
		expect(lookups).toHaveLength(lookupsAfterLogin);
	});

	it("REQ-007 AC-28 session issuance and sign-out never reach the log", async () => {
		let log = "";
		const { db, revocations } = fakeDb();
		server = Fastify({
			logger: {
				...loggerOptions,
				stream: {
					write: (line: string) => {
						log += line;
					},
				},
			},
		});
		await server.register(app, { db });

		const login = await session(server, "POST", bearer);
		const issued =
			/^waw_session=([^;]+)/.exec(String(login.headers["set-cookie"]))?.[1] ??
			"";
		const logout = await session(server, "DELETE", {
			cookie: `waw_session=${issued}`,
		});

		expect(login.statusCode).toBe(201);
		expect(issued).not.toBe("");
		expect(logout.statusCode).toBe(204);
		expect(revocations).toEqual([login.json().id]);
		expect(log).toContain("/session");
		for (const secret of [ownerToken, issued, "waw_session="]) {
			expect(log).not.toContain(secret);
		}
	});

	it.each([
		[
			"remote http",
			{ host: "tasks.example.com", origin: "http://tasks.example.com" },
			"https_required",
		],
		[
			"remote http with a foreign Origin",
			{ host: "tasks.example.com", origin: "https://evil.example" },
			"https_required",
		],
		["a foreign Origin", { origin: "https://evil.example" }, "csrf_forbidden"],
		["a missing Origin", { origin: undefined }, "csrf_forbidden"],
		["a null Origin", { origin: "null" }, "csrf_forbidden"],
	])(
		"REQ-007 AC-28 rejects insecure or cross-origin login before issuing: %s",
		async (_name, headers, error) => {
			const { db, inserts } = fakeDb();
			const target = await start(db);

			// Without a token too: the refusal comes before authentication.
			for (const auth of [bearer, {}]) {
				const res = await session(target, "POST", { ...auth, ...headers });

				expect(res.statusCode).toBe(403);
				expect(res.json()).toEqual({ error });
				expect(res.headers["cache-control"]).toBe("no-store");
				expect(res.headers["set-cookie"]).toBeUndefined();
			}
			expect(inserts).toEqual([]);
		},
	);

	it.each([
		["none", {}],
		["malformed", { authorization: "Bearer abc" }],
		["revoked", { authorization: `Bearer ${revokedToken}` }],
		["a cookie alone", { cookie }],
		["a bad token beside a cookie", { authorization: "Bearer abc", cookie }],
	])(
		"REQ-007 AC-28 login needs the owner's Bearer token: %s",
		async (_name, headers) => {
			const { db, inserts } = fakeDb();

			const res = await session(await start(db), "POST", headers);

			expect(res.statusCode).toBe(401);
			expect(res.json()).toEqual({ error: "unauthorized" });
			expect(res.headers["www-authenticate"]).toBe("Bearer");
			expect(res.headers["cache-control"]).toBe("no-store");
			expect(res.headers["set-cookie"]).toBeUndefined();
			expect(inserts).toEqual([]);
		},
	);

	it("keeps an already active browser session", async () => {
		const { db, inserts, revocations } = fakeDb();

		const res = await session(await start(db), "POST", { ...bearer, cookie });

		expect(res.statusCode).toBe(409);
		expect(res.json()).toEqual({ error: "session_active" });
		expect(res.headers["cache-control"]).toBe("no-store");
		expect(res.headers["set-cookie"]).toBeUndefined();
		expect(inserts).toEqual([]);
		expect(revocations).toEqual([]);
	});

	it.each([
		["revoked", `waw_session=${revokedToken}`],
		["malformed", "waw_session=abc"],
	])("replaces a %s session cookie at login", async (_name, stale) => {
		const { db, inserts } = fakeDb();

		const res = await session(await start(db), "POST", {
			...bearer,
			cookie: stale,
		});

		expect(res.statusCode).toBe(201);
		expect(res.headers["set-cookie"]).toMatch(/^waw_session=waw_ses_/);
		expect(inserts).toHaveLength(1);
	});

	it("REQ-007 AC-28 sign-out revokes only the cookie device and clears the cookie", async () => {
		const { db, revocations } = fakeDb();
		const target = await start(db);

		const first = await session(target, "DELETE", { ...bearer, cookie });

		expect(first.statusCode).toBe(204);
		expect(first.body).toBe("");
		expect(first.headers["cache-control"]).toBe("no-store");
		expect(first.headers["set-cookie"]).toBe(cleared);
		expect(revocations).toEqual([browserId]);

		const repeated = await session(target, "DELETE", { cookie });

		expect(repeated.statusCode).toBe(204);
		expect(repeated.headers["set-cookie"]).toBe(cleared);
		expect(revocations).toEqual([browserId]);
	});

	it.each([
		["no cookie", {}],
		["no cookie beside a Bearer token", bearer],
		["a malformed cookie", { cookie: "waw_session=abc" }],
		["a revoked cookie", { cookie: `waw_session=${revokedToken}` }],
	])("sign-out with %s only clears the cookie", async (_name, headers) => {
		const { db, revocations } = fakeDb();

		const res = await session(await start(db), "DELETE", headers);

		expect(res.statusCode).toBe(204);
		expect(res.headers["set-cookie"]).toBe(cleared);
		expect(revocations).toEqual([]);
	});

	it.each([
		["a foreign Origin", { origin: "https://evil.example" }, "csrf_forbidden"],
		["a missing Origin", { origin: undefined }, "csrf_forbidden"],
		[
			"remote http",
			{ host: "tasks.example.com", origin: "http://tasks.example.com" },
			"https_required",
		],
	])(
		"REQ-007 AC-28 a cross-origin sign-out leaves the session live: %s",
		async (_name, headers, error) => {
			const { db, revocations } = fakeDb();

			const res = await session(await start(db), "DELETE", {
				cookie,
				...headers,
			});

			expect(res.statusCode).toBe(403);
			expect(res.json()).toEqual({ error });
			expect(res.headers["cache-control"]).toBe("no-store");
			expect(res.headers["set-cookie"]).toBeUndefined();
			expect(revocations).toEqual([]);
		},
	);

	it("a failed revocation keeps the cookie so sign-out can be retried", async () => {
		const { db } = fakeDb({ failRevoke: true });

		const res = await session(await start(db), "DELETE", { cookie });

		expect(res.statusCode).toBe(500);
		expect(res.headers["set-cookie"]).toBeUndefined();
	});
});
