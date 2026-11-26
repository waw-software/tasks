import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
	makePairingLink,
	parsePublicUrl,
	publicAddressTrustProxy,
	resolvePublicUrl,
} from "../src/public-url.js";

const TRUSTED = "10.0.0.5";
const UNTRUSTED = "203.0.113.9";
const MESSAGE =
	"PUBLIC_URL must be an http or https origin, like https://tasks.example.com";

async function resolve(
	remoteAddress: string,
	headers: Record<string, string>,
	override?: string,
): Promise<string | null> {
	const server = Fastify({ trustProxy: publicAddressTrustProxy });
	server.get("/", async (request) => ({
		url: resolvePublicUrl(request, override),
	}));
	try {
		const res = await server.inject({
			method: "GET",
			url: "/",
			remoteAddress,
			headers,
		});
		return res.json<{ url: string | null }>().url;
	} finally {
		await server.close();
	}
}

describe("REQ-011 AC-39 the public origin of pairing links", () => {
	it("uses the forwarded proto from a trusted proxy and the Host header", async () => {
		const url = await resolve(TRUSTED, {
			"x-forwarded-proto": "https",
			"x-forwarded-host": "other.example.com",
			host: "tasks.example.com",
		});

		expect(url).toBe("https://tasks.example.com");
	});

	it("ignores the forwarded proto from an untrusted peer", async () => {
		const url = await resolve(UNTRUSTED, {
			"x-forwarded-proto": "https",
			host: "tasks.example.com",
		});

		expect(url).toBe("http://tasks.example.com");
	});

	it("rejects a forwarded proto that is not http or https", async () => {
		const url = await resolve(TRUSTED, {
			"x-forwarded-proto": "javascript",
			host: "tasks.example.com",
		});

		expect(url).toBeNull();
	});

	it("the override wins over the request", async () => {
		const url = await resolve(
			TRUSTED,
			{ "x-forwarded-proto": "http", host: "bad host" },
			"https://public.example.com",
		);

		expect(url).toBe("https://public.example.com");
	});

	it("rejects a Host with user info, a path or spaces", () => {
		for (const host of [
			"user@tasks.example.com",
			"tasks.example.com/path",
			"tasks.example.com\\path",
			"tasks.example.com?q=1",
			"tasks.example.com#f",
			"tasks example.com",
			" tasks.example.com",
			"tasks.example.com:0",
			"tasks.example.com:65536",
			"tasks.example.com:",
			"::1",
			"[not-ipv6]",
			"[:::]:3000",
			"999.999.999.999",
			"a..b",
			"",
		]) {
			expect(
				resolvePublicUrl({ protocol: "http", headers: { host } }),
				host,
			).toBeNull();
		}
		expect(resolvePublicUrl({ protocol: "http", headers: {} })).toBeNull();
	});

	it("accepts a Host with an IPv6 or IPv4 address and a port", async () => {
		for (const host of [
			"[::1]:3000",
			"127.0.0.1:3000",
			"localhost:65535",
			"tasks.example.com",
		]) {
			expect(await resolve(UNTRUSTED, { host }), host).toBe(`http://${host}`);
		}
	});

	it("parsePublicUrl accepts an origin and rejects a path, query, fragment, user info and other schemes without echoing the value", () => {
		expect(parsePublicUrl(undefined)).toBeUndefined();
		expect(parsePublicUrl("")).toBeUndefined();
		expect(parsePublicUrl("https://tasks.example.com")).toBe(
			"https://tasks.example.com",
		);
		expect(parsePublicUrl("HTTPS://Tasks.Example.com:443/")).toBe(
			"https://tasks.example.com",
		);
		expect(parsePublicUrl("http://[::1]:3000/")).toBe("http://[::1]:3000");

		for (const raw of [
			"https://tasks.example.com/secret",
			"https://tasks.example.com/secret/..",
			"https://tasks.example.com//",
			"https://tasks.example.com?secret=1",
			"https://tasks.example.com?",
			"https://tasks.example.com#secret",
			"https://tasks.example.com#",
			"https://secret:pw@tasks.example.com",
			"https://@tasks.example.com",
			"ftp://secret.example.com",
			"https:secret.example.com",
			"https:///secret.example.com",
			"secret.example.com",
			" https://secret.example.com",
			"https://secret example.com",
			"https://secret.example.com:99999",
			"https://",
		]) {
			let thrown: unknown;
			try {
				parsePublicUrl(raw);
			} catch (error) {
				thrown = error;
			}
			expect(thrown, raw).toBeInstanceOf(Error);
			expect((thrown as Error).message, raw).toBe(MESSAGE);
			expect((thrown as Error).cause, raw).toBeUndefined();
		}
	});

	it("makePairingLink puts the token in the fragment", () => {
		const token = `waw_pair_${"a".repeat(43)}`;
		const link = makePairingLink("https://tasks.example.com", token);

		expect(link).toBe(`https://tasks.example.com/pair#token=${token}`);
		const url = new URL(link);
		expect(url.pathname).toBe("/pair");
		expect(url.search).toBe("");
		expect(url.hash).toBe(`#token=${token}`);
	});

	it("makePairingLink uses https for an http origin and keeps host and port", () => {
		const token = `waw_pair_${"a".repeat(43)}`;

		for (const [origin, expected] of [
			["http://127.0.0.1:3000", "https://127.0.0.1:3000"],
			["http://[::1]:3000", "https://[::1]:3000"],
			["http://tasks.example.com", "https://tasks.example.com"],
			["https://tasks.example.com:8443", "https://tasks.example.com:8443"],
		] as const) {
			expect(makePairingLink(origin, token), origin).toBe(
				`${expected}/pair#token=${token}`,
			);
		}
	});
});
