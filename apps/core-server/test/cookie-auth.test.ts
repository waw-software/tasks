import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { loggerOptions } from "../src/auth/device-auth.js";
import type { AppDb } from "../src/auth/device-store.js";
import { sessionRequestError } from "../src/auth/session-cookie.js";
import { publicAddressTrustProxy } from "../src/public-url.js";

const deviceId = "3f1c2a9e-5b7d-4c1a-9e2f-8a6b4d0c7e15";
const token = `waw_ses_${"A".repeat(43)}`;
const otherToken = `waw_ses_${"B".repeat(43)}`;
const deviceToken = `waw_dev_${"C".repeat(43)}`;
const cookie = `waw_session=${token}`;
const loopbackHost = "127.0.0.1:3000";

/** A database that counts lookups and writes, and knows one token unless it is revoked. */
function fakeDb(options: { revoked?: boolean } = {}) {
	const counts = { lookups: 0, writes: 0 };
	const query = {
		from: () => query,
		where: () => query,
		limit: async () => {
			counts.lookups += 1;
			return options.revoked ? [] : [{ id: deviceId }];
		},
	};
	const write = async () => {
		counts.writes += 1;
	};
	const writer = {
		select: () => query,
		insert: () => ({ values: write }),
		update: () => ({ set: () => ({ where: write }) }),
		delete: () => ({ where: write }),
		transaction: async () => {
			counts.writes += 1;
		},
	};
	return { db: writer as unknown as AppDb, counts };
}

describe("session cookie auth", () => {
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

	function getCurrent(
		target: FastifyInstance,
		headers: Record<string, string>,
	) {
		return target.inject({
			method: "GET",
			url: "/tokens/current",
			remoteAddress: "127.0.0.1",
			headers: { host: loopbackHost, ...headers },
		});
	}

	it("REQ-007 AC-28 a valid session cookie reaches /tokens/current and is refreshed", async () => {
		const target = await start(fakeDb().db);

		const plain = await getCurrent(target, { cookie: `theme=dark; ${cookie}` });
		const secure = await getCurrent(target, {
			cookie,
			host: "tasks.example.com",
			"x-forwarded-proto": "https",
		});

		expect(plain.statusCode).toBe(200);
		expect(plain.json()).toEqual({ id: deviceId });
		expect(plain.headers["cache-control"]).toBe("no-store");
		expect(plain.headers["set-cookie"]).toBe(
			`waw_session=${token}; Path=/; Max-Age=34560000; HttpOnly; SameSite=Strict`,
		);
		expect(secure.statusCode).toBe(200);
		expect(secure.headers["set-cookie"]).toBe(
			`waw_session=${token}; Path=/; Max-Age=34560000; HttpOnly; SameSite=Strict; Secure`,
		);
	});

	it("REQ-007 AC-28 an explicit Authorization header wins over the cookie", async () => {
		const { db, counts } = fakeDb();
		const target = await start(db);

		for (const authorization of ["Bearer bad", "Basic x", ""]) {
			const res = await getCurrent(target, { cookie, authorization });

			expect(res.statusCode, authorization).toBe(401);
			expect(res.headers["set-cookie"]).toBeUndefined();
		}
		expect(counts.lookups).toBe(0);

		const bearer = await getCurrent(target, {
			cookie,
			authorization: `Bearer ${deviceToken}`,
		});

		expect(bearer.statusCode).toBe(200);
		expect(bearer.headers["set-cookie"]).toBeUndefined();
	});

	it.each([
		["malformed", "waw_session=abc", false, 0],
		["empty", "waw_session=", false, 0],
		["duplicate", `${cookie}; waw_session=${otherToken}`, false, 0],
		["revoked", cookie, true, 1],
	])(
		"REQ-007 AC-28 a malformed, duplicate or revoked cookie is refused and cleared: %s",
		async (_name, header, revoked, lookups) => {
			const { db, counts } = fakeDb({ revoked });

			const res = await getCurrent(await start(db), { cookie: header });

			expect(res.statusCode).toBe(401);
			expect(res.json()).toEqual({ error: "unauthorized" });
			expect(res.headers["www-authenticate"]).toBe("Bearer");
			expect(res.headers["set-cookie"]).toBe(
				"waw_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
			);
			expect(counts.lookups).toBe(lookups);
		},
	);

	it("REQ-007 AC-28 a device token in the cookie is refused", async () => {
		const { db, counts } = fakeDb();

		const res = await getCurrent(await start(db), {
			cookie: `waw_session=${deviceToken}`,
		});

		expect(res.statusCode).toBe(401);
		expect(res.json()).toEqual({ error: "unauthorized" });
		expect(res.headers["set-cookie"]).toBe(
			"waw_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict",
		);
		expect(counts.lookups).toBe(0);
	});

	it("REQ-007 AC-28 a cookie over remote http is refused", async () => {
		const { db, counts } = fakeDb();

		const res = await getCurrent(await start(db), {
			cookie,
			host: "tasks.example.com",
		});

		expect(res.statusCode).toBe(403);
		expect(res.json()).toEqual({ error: "https_required" });
		expect(res.headers["set-cookie"]).toBeUndefined();
		expect(counts.lookups).toBe(0);
	});

	it.each([
		["POST", "/tokens"],
		["POST", "/tokens/pairing"],
		["DELETE", `/tokens/${deviceId}`],
	] as const)(
		"REQ-007 AC-28 a live cookie alone cannot issue a token or a pairing link: %s %s",
		async (method, url) => {
			const { db, counts } = fakeDb();
			const target = await start(db);

			const res = await target.inject({
				method,
				url,
				headers: {
					host: loopbackHost,
					origin: `http://${loopbackHost}`,
					cookie,
				},
			});

			expect(res.statusCode).toBe(401);
			expect(res.headers["set-cookie"]).toBeUndefined();
			expect(counts).toEqual({ lookups: 0, writes: 0 });
		},
	);

	it.each([
		["missing", undefined],
		["null", "null"],
		["a foreign host", "https://evil.example"],
		["another port", "https://tasks.example.com:8443"],
		["another scheme", "http://tasks.example.com"],
		["a list value", ["https://tasks.example.com"]],
	])(
		"sessionRequestError refuses a foreign or missing Origin: %s",
		(_name, origin) => {
			const request = {
				protocol: "https" as const,
				headers: {
					host: "tasks.example.com",
					origin: origin as string | undefined,
				},
			};

			expect(sessionRequestError(request, true)).toEqual({
				error: "csrf_forbidden",
			});
			expect(sessionRequestError(request, false)).toBeNull();
		},
	);

	it("sessionRequestError accepts the same origin and requires https first for a remote host", () => {
		const origin = "https://tasks.example.com";
		const host = "tasks.example.com";

		expect(
			sessionRequestError(
				{ protocol: "https", headers: { host, origin } },
				true,
			),
		).toBeNull();
		expect(
			sessionRequestError(
				{
					protocol: "http",
					headers: { host, origin: "http://tasks.example.com" },
				},
				true,
			),
		).toEqual({ error: "https_required" });
		expect(
			sessionRequestError(
				{ protocol: "https", headers: { host: "bad host", origin } },
				true,
			),
		).toEqual({ error: "csrf_forbidden" });
	});

	it("REQ-007 AC-28 the session cookie never reaches the log", async () => {
		let log = "";
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
		await server.register(app, { db: fakeDb().db });

		const res = await getCurrent(server, { cookie });

		expect(res.statusCode).toBe(200);
		expect(res.headers["set-cookie"]).toContain(token);
		expect(log).toContain("/tokens/current");
		expect(log).not.toContain(token);
		expect(log).not.toContain("waw_session=");
	});
});
