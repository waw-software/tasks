import { describe, expect, it } from "vitest";
import {
	type ConnectFetch,
	type ConnectInput,
	connect,
	isDeviceToken,
	isLoopbackHost,
	normalizeServerOrigin,
	parsePairingLink,
	probeHealth,
} from "../src/connect.js";

const ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c";
const SECRET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL01_-9";
const TOKEN = `waw_dev_${SECRET}`;
const PAIRING = `waw_pair_${SECRET}`;
const LINK = `https://tasks.example.com/pair#token=${PAIRING}`;
const HEALTH = { apiVersion: 1, capabilities: ["connect"] };
const SIGNAL = { name: "caller signal" };

type Reply = { status: number; body?: unknown; badJson?: true } | "throw";
type Call = { url: string; init: Parameters<ConnectFetch<typeof SIGNAL>>[1] };

function fakeFetch(...replies: Reply[]) {
	const calls: Call[] = [];
	const fetcher: ConnectFetch<typeof SIGNAL> = async (url, init) => {
		calls.push({ url, init });
		const reply = replies[calls.length - 1];
		if (reply === undefined || reply === "throw") {
			throw new Error(`network failure for ${url} ${TOKEN}`);
		}
		return {
			status: reply.status,
			json: async () => {
				if (reply.badJson) throw new Error(`bad JSON ${TOKEN}`);
				return reply.body;
			},
		};
	};
	return { calls, fetcher };
}

const healthy: Reply = { status: 200, body: HEALTH };

function manual(serverUrl: string, token: string = TOKEN): ConnectInput {
	return { kind: "manual", serverUrl, token };
}

const pairing: ConnectInput = { kind: "pairing", link: LINK };

describe("connect client", () => {
	it("REQ-007 AC-28 checks the bearer token after public health", async () => {
		const { calls, fetcher } = fakeFetch(healthy, {
			status: 200,
			body: { id: ID },
		});

		const result = await connect(
			manual("  HTTPS://Tasks.Example.com:443/ ", ` ${TOKEN}\n`),
			fetcher,
			SIGNAL,
		);

		expect(result).toStrictEqual({
			ok: true,
			value: {
				serverUrl: "https://tasks.example.com",
				token: TOKEN,
				health: HEALTH,
			},
		});
		expect(calls).toStrictEqual([
			{
				url: "https://tasks.example.com/health",
				init: {
					method: "GET",
					headers: { accept: "application/json" },
					redirect: "error",
					signal: SIGNAL,
				},
			},
			{
				url: "https://tasks.example.com/tokens/current",
				init: {
					method: "GET",
					headers: {
						accept: "application/json",
						authorization: `Bearer ${TOKEN}`,
					},
					redirect: "error",
					signal: SIGNAL,
				},
			},
		]);
		expect(calls.every((call) => call.init.signal === SIGNAL)).toBe(true);
	});

	it.each([
		["an empty address", "", "invalid-address"],
		["no scheme", "tasks.example.com", "invalid-address"],
		["another scheme", "ftp://x", "invalid-address"],
		["a missing slash", "https:/x", "invalid-address"],
		["no host", "https://", "invalid-address"],
		["a bad port", "https://x:70000", "invalid-address"],
		["a space in the host", "https://a b", "invalid-address"],
		["a newline in the host", "https://a\nb", "invalid-address"],
		["user info", "https://u:p@x", "invalid-address"],
		["empty user info", "https://@x", "invalid-address"],
		["a path", "https://x/path", "invalid-address"],
		["a dot segment", "https://x/.", "invalid-address"],
		["a backslash", "https://x\\", "invalid-address"],
		["a query", "https://x?a=1", "invalid-address"],
		["an empty query", "https://x?", "invalid-address"],
		["a fragment", "https://x#a", "invalid-address"],
		["an empty fragment", "https://x/#", "invalid-address"],
		["remote http", "http://192.168.1.2:3000", "https-required"],
		["remote http by name", "http://tasks.example.com", "https-required"],
		["a loopback look-alike", "http://127.0.0.1.example.com", "https-required"],
		[
			"a localhost look-alike",
			"http://localhost.example.com",
			"https-required",
		],
	] as const)(
		"REQ-007 AC-28 refuses before any request: %s",
		async (_, serverUrl, error) => {
			const { calls, fetcher } = fakeFetch();

			expect(normalizeServerOrigin(serverUrl)).toStrictEqual({
				ok: false,
				error,
			});
			expect(await connect(manual(serverUrl), fetcher, SIGNAL)).toStrictEqual({
				ok: false,
				error,
			});
			expect(calls).toStrictEqual([]);
		},
	);

	it.each([
		["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
		["http://127.8.9.10", "http://127.8.9.10"],
		["http://[::1]", "http://[::1]"],
		["http://[::1]:3000/", "http://[::1]:3000"],
		["http://localhost", "http://localhost"],
		["http://LOCALHOST:80", "http://localhost"],
		["https://192.168.1.2:8443", "https://192.168.1.2:8443"],
	])("REQ-007 AC-28 accepts the origin %s", (raw, origin) => {
		expect(normalizeServerOrigin(raw)).toStrictEqual({
			ok: true,
			value: origin,
		});
	});

	it.each([
		["localhost", true],
		["LocalHost:3000", true],
		["127.0.0.1", true],
		["127.255.0.1:80", true],
		["[::1]", true],
		["[::1]:3000", true],
		["::1", false],
		["128.0.0.1", false],
		["127.0.0.1.example.com", false],
		["localhost.example.com", false],
		["", false],
	])("REQ-007 AC-28 knows whether %j is loopback", (host, loopback) => {
		expect(isLoopbackHost(host)).toBe(loopback);
	});

	it.each([
		["an empty token", ""],
		["a pairing token", PAIRING],
		["a token one character short", TOKEN.slice(0, -1)],
		["a token one character long", `${TOKEN}a`],
		["a token with a space inside", `waw_dev_ ${SECRET.slice(1)}`],
	])("REQ-007 AC-28 refuses before any request: %s", async (_, token) => {
		const { calls, fetcher } = fakeFetch();

		expect(isDeviceToken(token)).toBe(false);
		expect(
			await connect(manual("https://x", token), fetcher, SIGNAL),
		).toStrictEqual({ ok: false, error: "invalid-token" });
		expect(calls).toStrictEqual([]);
	});

	it("REQ-007 AC-28 redeems the exact HTTPS pairing fragment", async () => {
		const issued = `waw_dev_${"Z".repeat(43)}`;
		const { calls, fetcher } = fakeFetch(healthy, {
			status: 201,
			body: { id: ID, token: issued },
		});

		const result = await connect(
			{ kind: "pairing", link: ` ${LINK}\n` },
			fetcher,
			SIGNAL,
		);

		expect(result).toStrictEqual({
			ok: true,
			value: {
				serverUrl: "https://tasks.example.com",
				token: issued,
				health: HEALTH,
			},
		});
		expect(calls).toStrictEqual([
			{
				url: "https://tasks.example.com/health",
				init: {
					method: "GET",
					headers: { accept: "application/json" },
					redirect: "error",
					signal: SIGNAL,
				},
			},
			{
				url: "https://tasks.example.com/tokens/pairing/redeem",
				init: {
					method: "POST",
					headers: {
						accept: "application/json",
						"content-type": "application/json",
					},
					body: `{"token":"${PAIRING}"}`,
					redirect: "error",
					signal: SIGNAL,
				},
			},
		]);
		expect(calls.every((call) => call.init.signal === SIGNAL)).toBe(true);
	});

	it.each([
		["https://Tasks.Example.com:443", "https://tasks.example.com"],
		["https://127.0.0.1:8443", "https://127.0.0.1:8443"],
		["https://[::1]", "https://[::1]"],
	])("REQ-007 AC-28 reads the origin of a link to %s", (base, origin) => {
		expect(parsePairingLink(`${base}/pair#token=${PAIRING}`)).toStrictEqual({
			ok: true,
			value: { origin, token: PAIRING },
		});
	});

	it.each([
		["not a link", "x"],
		["http", `http://x/pair#token=${PAIRING}`],
		["http on loopback", `http://localhost/pair#token=${PAIRING}`],
		["no host", `https:///pair#token=${PAIRING}`],
		["a bad port", `https://x:70000/pair#token=${PAIRING}`],
		["user info", `https://u:p@x/pair#token=${PAIRING}`],
		["another path", `https://x/pairx#token=${PAIRING}`],
		["a path in another case", `https://x/PAIR#token=${PAIRING}`],
		["a trailing slash", `https://x/pair/#token=${PAIRING}`],
		["a dot segment", `https://x/a/../pair#token=${PAIRING}`],
		["a query", `https://x/pair?a=1#token=${PAIRING}`],
		["an empty query", `https://x/pair?#token=${PAIRING}`],
		["no fragment", "https://x/pair"],
		["another fragment key", `https://x/pair#code=${PAIRING}`],
		["an extra fragment field", `https://x/pair#token=${PAIRING}&a=1`],
		["a wrong prefix", `https://x/pair#token=${TOKEN}`],
		["a token of length 42", `https://x/pair#token=${PAIRING.slice(0, -1)}`],
		["a token of length 44", `https://x/pair#token=${PAIRING}a`],
	])("REQ-007 AC-28 refuses before any request: %s", async (_, link) => {
		const { calls, fetcher } = fakeFetch();

		expect(
			await connect({ kind: "pairing", link }, fetcher, SIGNAL),
		).toStrictEqual({ ok: false, error: "invalid-pairing-link" });
		expect(calls).toStrictEqual([]);
	});

	it.each([
		["a status 500", { status: 500, body: HEALTH }, "invalid-response"],
		["a status 201", { status: 201, body: HEALTH }, "invalid-response"],
		["bad JSON", { status: 200, badJson: true }, "invalid-response"],
		["a malformed body", { status: 200, body: {} }, "invalid-response"],
		["a network failure", "throw", "unreachable"],
	] as const)(
		"REQ-007 AC-28 sends no secret when the health check fails: %s",
		async (_, reply, error) => {
			for (const input of [manual("https://x"), pairing]) {
				const { calls, fetcher } = fakeFetch(reply);

				expect(await connect(input, fetcher, SIGNAL)).toStrictEqual({
					ok: false,
					error,
				});
				expect(calls).toHaveLength(1);
				expect(calls[0]?.init.headers).toStrictEqual({
					accept: "application/json",
				});
				expect(calls[0]?.init.body).toBeUndefined();
			}
		},
	);

	it.each([
		["manual", manual("https://x"), "unauthorized"],
		["pairing", pairing, "pairing-rejected"],
	] as const)(
		"reports a refused token or link: %s",
		async (_, input, error) => {
			const { fetcher } = fakeFetch(healthy, { status: 401 });

			expect(await connect(input, fetcher, SIGNAL)).toStrictEqual({
				ok: false,
				error,
				health: HEALTH,
			});
		},
	);

	it.each([
		[
			"a malformed identity",
			manual("https://x"),
			{ status: 200, body: { id: "device-1" } },
			"invalid-response",
		],
		[
			"bad identity JSON",
			manual("https://x"),
			{ status: 200, badJson: true },
			"invalid-response",
		],
		[
			"an unexpected identity status",
			manual("https://x"),
			{ status: 403, body: { id: ID } },
			"invalid-response",
		],
		["a lost identity request", manual("https://x"), "throw", "unreachable"],
		[
			"a malformed credential",
			pairing,
			{ status: 201, body: { id: ID, token: PAIRING } },
			"invalid-response",
		],
		[
			"bad credential JSON",
			pairing,
			{ status: 201, badJson: true },
			"invalid-response",
		],
		[
			"a redemption answered with 200",
			pairing,
			{ status: 200, body: { id: ID, token: TOKEN } },
			"invalid-response",
		],
		["a lost redemption", pairing, "throw", "unreachable"],
	] as const)(
		"reports a refused token or link: %s",
		async (_, input, reply, error) => {
			const { calls, fetcher } = fakeFetch(healthy, reply);

			expect(await connect(input, fetcher, SIGNAL)).toStrictEqual({
				ok: false,
				error,
			});
			expect(calls).toHaveLength(2);
		},
	);

	it("REQ-010 AC-36 accepts added fields in replies", async () => {
		const health: Reply = {
			status: 200,
			body: { ...HEALTH, serverName: "x" },
		};
		const probe = fakeFetch(health);
		const redeem = fakeFetch(health, {
			status: 201,
			body: { id: ID, token: TOKEN, label: "phone" },
		});

		expect(await probeHealth("https://x", probe.fetcher, SIGNAL)).toStrictEqual(
			{ ok: true, value: HEALTH },
		);
		expect(await connect(pairing, redeem.fetcher, SIGNAL)).toStrictEqual({
			ok: true,
			value: {
				serverUrl: "https://tasks.example.com",
				token: TOKEN,
				health: HEALTH,
			},
		});
	});
});
