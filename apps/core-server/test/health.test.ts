import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("GET /health", () => {
	let server: FastifyInstance;

	afterEach(async () => {
		await server.close();
	});

	async function getHealth() {
		server = Fastify();
		await server.register(app);
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
});
