import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { resolveWebRoot } from "../src/web-root.js";

const INDEX = "<!doctype html><title>shell</title>";

describe("REQ-001 AC-03 the web client on the server origin", () => {
	let base: string;
	let webRoot: string;
	let server: FastifyInstance;

	beforeAll(async () => {
		base = await mkdtemp(join(tmpdir(), "waw-web-"));
		webRoot = join(base, "dist");
		await mkdir(join(webRoot, "assets"), { recursive: true });
		await mkdir(join(webRoot, "fonts"));
		await writeFile(join(webRoot, "index.html"), INDEX);
		await writeFile(join(webRoot, "assets", "a.js"), "export {};");
		await writeFile(join(webRoot, "fonts", "f.woff2"), "wOF2");
		await writeFile(join(base, "secret.txt"), "outside the build");
		server = Fastify();
		await server.register(app, { webRoot });
	});

	afterAll(async () => {
		await server?.close();
		await rm(base, { recursive: true, force: true });
	});

	const get = (url: string) => server.inject({ method: "GET", url });

	it("serves index.html at /", async () => {
		const res = await get("/");

		expect(res.statusCode).toBe(200);
		expect(res.headers["content-type"]).toMatch(/^text\/html/);
		expect(res.headers["cache-control"]).toBe("no-cache");
		expect(res.body).toBe(INDEX);
	});

	it("redirects /setup to / on a server without first-run setup", async () => {
		const res = await get("/setup");

		expect(res.statusCode).toBe(302);
		expect(res.headers.location).toBe("/");
	});

	it("serves files under /assets/ and /fonts/", async () => {
		const script = await get("/assets/a.js");
		expect(script.statusCode).toBe(200);
		expect(script.headers["content-type"]).toMatch(/javascript/);
		expect(script.body).toBe("export {};");

		const font = await get("/fonts/f.woff2");
		expect(font.statusCode).toBe(200);
		expect(font.headers["content-type"]).toBe("font/woff2");
		expect(font.body).toBe("wOF2");
	});

	it("answers 404 for a missing asset, a path outside the build and an unknown route", async () => {
		for (const url of [
			"/assets/nope.js",
			"/fonts/nope.woff2",
			"/assets/",
			"/fonts/",
			"/assets",
			"/assets/../../secret.txt",
			"/assets/%2e%2e/%2e%2e/secret.txt",
			"/assets/..%2f..%2fsecret.txt",
			"/fonts/..%2findex.html",
			"/assets/%2e%2e%2findex.html",
			"/index.html",
			"/secret.txt",
			"/nope",
			"/tasks/1",
		]) {
			const res = await get(url);
			expect({ url, status: res.statusCode }).toEqual({ url, status: 404 });
			expect(res.body).not.toContain("outside the build");
			expect(res.body).not.toContain(INDEX);
		}
	});

	it("resolveWebRoot rejects a missing index and a relative WEB_ROOT", () => {
		expect(resolveWebRoot({ WEB_ROOT: webRoot })).toBe(webRoot);

		const empty = join(webRoot, "assets");
		expect(() => resolveWebRoot({ WEB_ROOT: empty })).toThrow(
			`web client build not found: ${join(empty, "index.html")}`,
		);
		expect(() => resolveWebRoot({ WEB_ROOT: "apps/web/dist" })).toThrow(
			/WEB_ROOT must be an absolute path/,
		);
	});

	it("resolveWebRoot defaults to apps/web/dist of the repository", () => {
		const dist = fileURLToPath(new URL("../../web/dist", import.meta.url));
		let resolved: string;
		try {
			resolved = resolveWebRoot({});
		} catch (error) {
			// Without a web build the error names the default location.
			expect((error as Error).message).toBe(
				`web client build not found: ${join(dist, "index.html")}`,
			);
			return;
		}
		expect(resolved).toBe(dist);
	});
});
