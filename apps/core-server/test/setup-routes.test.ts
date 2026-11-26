import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import type { SetupClaimResult, SetupService } from "../src/auth/setup.js";
import { publicAddressTrustProxy } from "../src/public-url.js";

const INDEX = "<!doctype html><title>shell</title>";
const CODE = `waw_setup_${"c".repeat(43)}`;
const PUBLIC_URL = "https://tasks.example.com";
const DATA = {
	serverUrl: PUBLIC_URL,
	accessToken: `waw_device_${"a".repeat(43)}`,
	pairingLink: `${PUBLIC_URL}/pair#token=waw_pair_${"p".repeat(43)}`,
	qrDataUrl: "data:image/png;base64,AAAA",
};

describe("REQ-011 AC-39 the first-run setup routes", () => {
	let webRoot: string;
	let server: FastifyInstance;
	let claimed: boolean;
	let result: SetupClaimResult;
	let claims: [string, string][];

	const setup: SetupService = {
		isClaimed: async () => claimed,
		claim: async (code, serverUrl) => {
			claims.push([code, serverUrl]);
			return result;
		},
	};

	beforeAll(async () => {
		webRoot = await mkdtemp(join(tmpdir(), "waw-setup-"));
		for (const dir of ["assets", "fonts"]) {
			await mkdir(join(webRoot, dir));
		}
		await writeFile(join(webRoot, "index.html"), INDEX);
		server = Fastify({ trustProxy: publicAddressTrustProxy });
		await server.register(app, { webRoot, publicUrl: PUBLIC_URL, setup });
	});

	beforeEach(() => {
		claimed = false;
		result = { kind: "claimed", data: DATA };
		claims = [];
	});

	afterAll(async () => {
		await server?.close();
		await rm(webRoot, { recursive: true, force: true });
	});

	const get = (url: string) => server.inject({ method: "GET", url });
	const post = (payload: object | string) =>
		server.inject({
			method: "POST",
			url: "/setup/claim",
			headers: { "content-type": "application/json" },
			payload,
		});

	it("redirects / to /setup while unclaimed", async () => {
		const res = await get("/");

		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe("/setup");
		expect(res.headers["cache-control"]).toBe("no-store");

		claimed = true;
		const shell = await get("/");
		expect(shell.statusCode).toBe(200);
		expect(shell.body).toBe(INDEX);
		expect(shell.headers["cache-control"]).toBe("no-cache");
	});

	it("serves /setup while unclaimed and redirects it to / once claimed", async () => {
		const page = await get("/setup");
		expect(page.statusCode).toBe(200);
		expect(page.headers["content-type"]).toMatch(/^text\/html/);
		expect(page.body).toBe(INDEX);

		claimed = true;
		const redirect = await get("/setup");
		expect(redirect.statusCode).toBe(302);
		expect(redirect.headers.location).toBe("/");
	});

	it("POST /setup/claim answers 201, 401 and 409 for claimed, invalid and closed", async () => {
		const created = await post({ code: CODE });
		expect(created.statusCode).toBe(201);
		expect(created.json()).toEqual(DATA);
		expect(claims).toEqual([[CODE, PUBLIC_URL]]);

		result = { kind: "invalid" };
		const invalid = await post({ code: CODE });
		expect(invalid.statusCode).toBe(401);
		expect(invalid.json()).toEqual({ error: "unauthorized" });

		result = { kind: "closed" };
		const closed = await post({ code: CODE });
		expect(closed.statusCode).toBe(409);
		expect(closed.json()).toEqual({ error: "setup_closed" });
	});

	it("answers 400 without claiming when the request gives no public address", async () => {
		const own = Fastify({ trustProxy: publicAddressTrustProxy });
		await own.register(app, { setup });

		const res = await own.inject({
			method: "POST",
			url: "/setup/claim",
			headers: { host: "bad host", "x-forwarded-proto": "https" },
			payload: { code: CODE },
		});
		await own.close();

		expect(res.statusCode).toBe(400);
		expect(res.json()).toEqual({ error: "invalid_public_address" });
		expect(claims).toEqual([]);
	});

	const claimFrom = (
		headers: Record<string, string>,
		remoteAddress = "203.0.113.7",
	) =>
		server.inject({
			method: "POST",
			url: "/setup/claim",
			remoteAddress,
			headers,
			payload: { code: CODE },
		});

	it("accepts a claim over plain HTTP on a loopback host", async () => {
		for (const host of [
			"127.0.0.1:3000",
			"localhost:3000",
			"localhost",
			"[::1]:3000",
			"127.8.9.10",
		]) {
			const res = await claimFrom({ host });
			expect({ host, status: res.statusCode }).toEqual({ host, status: 201 });
		}
		expect(claims).toHaveLength(5);
	});

	it("refuses a claim over plain HTTP on another host with 403 https_required, without calling the service", async () => {
		for (const headers of [
			{ host: "tasks.example.com" },
			{ host: "192.168.1.20:3000" },
			{ host: "127.0.0.1.example.com" },
			{ host: "localhost.example.com:3000" },
			{ host: "example.com@localhost" },
			// The sender is not a trusted proxy, so its header does not count.
			{ host: "tasks.example.com", "x-forwarded-proto": "https" },
		]) {
			const res = await claimFrom(headers);
			expect({ headers, status: res.statusCode }).toEqual({
				headers,
				status: 403,
			});
			expect(res.json()).toEqual({ error: "https_required" });
			expect(res.headers["cache-control"]).toBe("no-store");
			expect(res.headers["referrer-policy"]).toBe("no-referrer");
		}
		expect(claims).toEqual([]);
	});

	it("accepts a claim on another host when a trusted proxy reports https", async () => {
		const res = await claimFrom(
			{ host: "tasks.example.com", "x-forwarded-proto": "https" },
			"10.0.0.5",
		);

		expect(res.statusCode).toBe(201);
		expect(claims).toEqual([[CODE, PUBLIC_URL]]);
	});

	it("rejects a malformed body with 400", async () => {
		for (const payload of [{}, { code: "short" }, "{"]) {
			const res = await post(payload);
			expect({ payload, status: res.statusCode }).toEqual({
				payload,
				status: 400,
			});
		}
		expect(claims).toEqual([]);

		const large = await post({ code: "c".repeat(2000) });
		expect(large.statusCode).toBe(413);
		expect(claims).toEqual([]);
	});

	it("sets no-store and no-referrer on setup responses", async () => {
		const responses = [await get("/setup"), await post({ code: CODE })];
		for (const kind of ["invalid", "closed"] as const) {
			result = { kind };
			responses.push(await post({ code: CODE }));
		}
		responses.push(await post({}));
		claimed = true;
		responses.push(await get("/setup"));

		for (const res of responses) {
			expect(res.headers["cache-control"]).toBe("no-store");
			expect(res.headers["referrer-policy"]).toBe("no-referrer");
		}
	});
});
