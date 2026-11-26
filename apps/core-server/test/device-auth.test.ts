import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { loggerOptions, notFound } from "../src/auth/device-auth.js";
import {
	type AppDb,
	hashDeviceToken,
	issueDeviceToken,
} from "../src/auth/device-store.js";

const deviceId = "3f1c2a9e-5b7d-4c1a-9e2f-8a6b4d0c7e15";
const token = `waw_dev_${"A".repeat(43)}`;

/** A database that knows one active token and counts the lookups. */
function fakeDb(): { db: AppDb; lookups: () => number } {
	let lookups = 0;
	const query = {
		from: () => query,
		where: () => query,
		limit: async () => {
			lookups += 1;
			return [{ id: deviceId }];
		},
	};
	return {
		db: { select: () => query } as unknown as AppDb,
		lookups: () => lookups,
	};
}

describe("device auth", () => {
	let server: FastifyInstance | undefined;

	afterEach(async () => {
		await server?.close();
		server = undefined;
	});

	async function start(db: AppDb): Promise<FastifyInstance> {
		server = Fastify();
		await server.register(app, { db });
		return server;
	}

	function getCurrent(target: FastifyInstance, authorization?: string) {
		return target.inject({
			method: "GET",
			url: "/tokens/current",
			headers: authorization === undefined ? {} : { authorization },
		});
	}

	it("rejects a request without Authorization with 401 and a Bearer challenge", async () => {
		const { db, lookups } = fakeDb();

		const res = await getCurrent(await start(db));

		expect(res.statusCode).toBe(401);
		expect(res.json()).toEqual({ error: "unauthorized" });
		expect(res.headers["www-authenticate"]).toBe("Bearer");
		expect(res.headers["cache-control"]).toBe("no-store");
		expect(lookups()).toBe(0);
	});

	it("rejects a malformed token without a database lookup", async () => {
		const { db, lookups } = fakeDb();
		const target = await start(db);

		for (const authorization of [
			"Bearer abc",
			"Basic x",
			`Basic ${token}`,
			token,
			`Bearer WAW_DEV_${"A".repeat(43)}`,
			`Bearer ${token}A`,
			`Bearer ${token} extra`,
		]) {
			const res = await getCurrent(target, authorization);

			expect(res.statusCode, authorization).toBe(401);
			expect(res.json()).toEqual({ error: "unauthorized" });
			expect(res.headers["www-authenticate"]).toBe("Bearer");
		}
		expect(lookups()).toBe(0);
	});

	it("accepts the bearer scheme in any case", async () => {
		const target = await start(fakeDb().db);

		for (const scheme of ["Bearer", "bearer", "BEARER"]) {
			const res = await getCurrent(target, `${scheme} ${token}`);

			expect(res.statusCode, scheme).toBe(200);
			expect(res.json()).toEqual({ id: deviceId });
		}
	});

	it("a failed lookup answers 500 without the token or its digest in the log or the body", async () => {
		const digest = hashDeviceToken(token);
		const failing = {
			from: () => failing,
			where: () => failing,
			limit: async () => {
				throw new Error(`Failed query: select\nparams: ${digest},1`);
			},
		};
		let log = "";
		server = Fastify({
			logger: {
				stream: {
					write: (line: string) => {
						log += line;
					},
				},
			},
		});
		await server.register(app, {
			db: { select: () => failing } as unknown as AppDb,
		});

		const res = await getCurrent(server, `Bearer ${token}`);

		expect(res.statusCode).toBe(500);
		expect(log).toContain("device token query failed");
		for (const secret of [digest, token]) {
			expect(res.body).not.toContain(secret);
			expect(log).not.toContain(secret);
		}
	});

	it("request logs name the route template, never the URL, query or headers", async () => {
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
		server.setNotFoundHandler(notFound);
		await server.register(app, { db: fakeDb().db });

		const matched = await server.inject({
			method: "DELETE",
			url: `/tokens/${token}?token=${token}`,
			headers: { "x-pasted": token },
		});
		const unmatched = await server.inject({
			method: "GET",
			url: `/nope/${token}?token=${token}`,
		});

		expect(matched.statusCode).toBe(400);
		expect(unmatched.statusCode).toBe(404);
		const requests = log
			.trim()
			.split("\n")
			.map((line) => JSON.parse(line).req)
			.filter(Boolean);
		expect(requests).toEqual([
			{ method: "DELETE", route: "/tokens/:id", remoteAddress: "127.0.0.1" },
			{ method: "GET", route: "(no route)", remoteAddress: "127.0.0.1" },
		]);
		expect(log).not.toContain(token);
	});

	it("DELETE /tokens/:id rejects a urn:uuid: id with 400", async () => {
		const target = await start(fakeDb().db);

		const res = await target.inject({
			method: "DELETE",
			url: `/tokens/urn:uuid:${deviceId}`,
			headers: { authorization: `Bearer ${token}` },
		});

		expect(res.statusCode).toBe(400);
	});

	it("POST /tokens with a body is still authenticated", async () => {
		const target = await start(fakeDb().db);

		const res = await target.inject({
			method: "POST",
			url: "/tokens",
			payload: { any: "thing" },
		});

		expect(res.statusCode).toBe(401);
		expect(res.json()).toEqual({ error: "unauthorized" });
		expect(res.headers["www-authenticate"]).toBe("Bearer");
		expect(res.headers["cache-control"]).toBe("no-store");
	});

	it.each([
		["POST", "/tokens"],
		["DELETE", `/tokens/${deviceId}`],
	] as const)(
		"%s %s rejects a token revoked while the body is being read",
		async (method, url) => {
			let revoked = false;
			let writes = 0;
			const query = {
				from: () => query,
				where: () => query,
				limit: async () => (revoked ? [] : [{ id: deviceId }]),
			};
			const write = async () => {
				writes += 1;
			};
			const db = {
				select: () => query,
				insert: () => ({ values: write }),
				update: () => ({ set: () => ({ where: write }) }),
			} as unknown as AppDb;
			server = Fastify();
			// Runs between the request headers and the parsed body.
			server.addHook("preParsing", async () => {
				revoked = true;
			});
			await server.register(app, { db });

			const res = await server.inject({
				method,
				url,
				headers: { authorization: `Bearer ${token}` },
				payload: {},
			});

			expect(res.statusCode).toBe(401);
			expect(writes).toBe(0);
		},
	);

	it.each([
		["POST", "/tokens"],
		["DELETE", `/tokens/${deviceId}`],
	] as const)("%s %s limits the body to 1024 bytes", async (method, url) => {
		const target = await start(fakeDb().db);

		const res = await target.inject({
			method,
			url,
			headers: { authorization: `Bearer ${token}` },
			payload: { filler: "a".repeat(1024) },
		});

		expect(res.statusCode).toBe(413);
	});

	it("hashDeviceToken is SHA-256 hex and issueDeviceToken returns a token matching the contract pattern", async () => {
		expect(hashDeviceToken("abc")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);

		const rows: unknown[] = [];
		const db = {
			insert: () => ({
				values: async (row: unknown) => {
					rows.push(row);
				},
			}),
		} as unknown as AppDb;

		const credential = await issueDeviceToken(db);

		expect(credential.token).toMatch(/^waw_dev_[A-Za-z0-9_-]{43}$/);
		expect(rows).toEqual([
			{ id: credential.id, tokenHash: hashDeviceToken(credential.token) },
		]);
	});

	it("REQ-010 AC-36 REQ-001 AC-01: /health stays public when the token routes are installed", async () => {
		const { db, lookups } = fakeDb();
		const target = await start(db);

		const health = await target.inject({ method: "GET", url: "/health" });

		expect(health.statusCode).toBe(200);
		expect(health.json()).toEqual({
			apiVersion: 1,
			capabilities: ["connect"],
		});
		expect((await getCurrent(target)).statusCode).toBe(401);
		expect(lookups()).toBe(0);
	});
});
