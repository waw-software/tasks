import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { type AppOptions, app } from "../src/app.js";
import { CAPABILITIES } from "../src/capabilities.js";

describe("GET /health", () => {
	let server: FastifyInstance;

	afterEach(async () => {
		await server.close();
	});

	async function getHealth(options: AppOptions = {}) {
		server = Fastify();
		await server.register(app, options);
		return server.inject({ method: "GET", url: "/health" });
	}

	it("REQ-001 AC-01: GET /health answers 200 with apiVersion 1 and the capabilities", async () => {
		const res = await getHealth();

		expect(res.statusCode).toBe(200);
		expect(res.headers["content-type"]).toMatch(/^application\/json/);
		expect(res.json()).toEqual({ apiVersion: 1, capabilities: [] });
	});

	it("REQ-001 AC-01: GET /health answers only the contract fields", async () => {
		const res = await getHealth();

		expect(Object.keys(res.json()).sort()).toEqual([
			"apiVersion",
			"capabilities",
		]);
	});

	it.each([
		{ name: "an empty list", capabilities: [] },
		{ name: "a selected list", capabilities: ["connect", "x"] },
	])(
		"REQ-010 AC-34 serves the capability list it was given: $name",
		async ({ capabilities }) => {
			const res = await getHealth({ capabilities });

			expect(res.json()).toEqual({ apiVersion: 1, capabilities });
			expect(res.headers["cache-control"]).toBe("no-store");
		},
	);

	it("REQ-010 AC-34 serves the capability list it was given: none means the default", async () => {
		const res = await getHealth();

		expect(res.json()).toEqual({
			apiVersion: 1,
			capabilities: [...CAPABILITIES],
		});
		expect(res.headers["cache-control"]).toBe("no-store");
	});

	it("REQ-010 AC-34 serves the capability list it was given: a copy of it", async () => {
		const capabilities = ["connect"];
		await getHealth({ capabilities });

		capabilities.push("later");
		const res = await server.inject({ method: "GET", url: "/health" });

		expect(res.json()).toEqual({ apiVersion: 1, capabilities: ["connect"] });
	});
});
