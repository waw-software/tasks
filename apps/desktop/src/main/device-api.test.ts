import { describe, expect, it } from "vitest";
import { currentDevice, mintDevice, revokeDevice } from "./device-api";
import type { HttpReply, RequestFn, RequestInitLike } from "./types";

const SERVER = "https://tasks.example";
const TOKEN = `waw_dev_${"A".repeat(43)}`;
const MINTED_TOKEN = `waw_dev_${"B".repeat(43)}`;
const ID = "0b8f6c1e-2d4a-4f7b-9c3e-5a1d8e2f4b6c";

const UNAUTHORIZED = { ok: false, error: "unauthorized" };
const INVALID = { ok: false, error: "invalid-response" };
const UNREACHABLE = { ok: false, error: "unreachable" };

function fakeRequest(reply: () => Promise<HttpReply>) {
	const calls: { url: string; init: RequestInitLike }[] = [];
	const request: RequestFn = (url, init) => {
		calls.push({ url, init });
		return reply();
	};
	return { request, calls };
}

const answers = (status: number, body: unknown) =>
	fakeRequest(async () => ({ status, json: async () => body }));

/** The WAW server's answer to a token it refuses. */
const refused = () => answers(401, { error: "unauthorized" });

/** A reply whose body cannot be read: reading it would end as unreachable. */
const unreadable = (status: number) =>
	fakeRequest(async () => ({
		status,
		json: async () => {
			throw new Error("body not readable");
		},
	}));

const failing = () =>
	fakeRequest(async () => {
		throw new Error("network down");
	});

describe("currentDevice", () => {
	it("REQ-007 AC-28: current device reads the id with the Bearer token", async () => {
		const { signal } = new AbortController();
		const ok = answers(200, { id: ID });

		expect(await currentDevice(ok.request, signal, SERVER, TOKEN)).toEqual({
			ok: true,
			id: ID,
		});
		expect(ok.calls).toEqual([
			{
				url: "https://tasks.example/tokens/current",
				init: {
					method: "GET",
					headers: {
						accept: "application/json",
						authorization: `Bearer ${TOKEN}`,
					},
					redirect: "error",
					signal,
				},
			},
		]);
		expect(ok.calls[0]?.init.signal).toBe(signal);

		const cases: [ReturnType<typeof fakeRequest>, object][] = [
			[refused(), UNAUTHORIZED],
			[answers(200, {}), INVALID],
			[unreadable(500), INVALID],
			[answers(201, { id: ID }), INVALID],
			[unreadable(200), UNREACHABLE],
			[failing(), UNREACHABLE],
		];
		for (const [fake, expected] of cases) {
			expect(await currentDevice(fake.request, signal, SERVER, TOKEN)).toEqual(
				expected,
			);
		}
	});
});

describe("mintDevice", () => {
	it("REQ-007 AC-28: mint returns the new credential", async () => {
		const { signal } = new AbortController();
		const ok = answers(201, { id: ID, token: MINTED_TOKEN });

		expect(await mintDevice(ok.request, signal, SERVER, TOKEN)).toEqual({
			ok: true,
			id: ID,
			token: MINTED_TOKEN,
		});
		expect(ok.calls).toEqual([
			{
				url: "https://tasks.example/tokens",
				init: {
					method: "POST",
					headers: {
						accept: "application/json",
						authorization: `Bearer ${TOKEN}`,
					},
					redirect: "error",
					signal,
				},
			},
		]);
		expect(ok.calls[0]?.init.signal).toBe(signal);
		expect(ok.calls[0]?.init.body).toBeUndefined();

		const cases: [ReturnType<typeof fakeRequest>, object][] = [
			[refused(), UNAUTHORIZED],
			[answers(201, { id: ID, token: "waw_dev_short" }), INVALID],
			[unreadable(500), INVALID],
			[answers(200, { id: ID, token: MINTED_TOKEN }), INVALID],
			[unreadable(201), UNREACHABLE],
			[failing(), UNREACHABLE],
		];
		for (const [fake, expected] of cases) {
			expect(await mintDevice(fake.request, signal, SERVER, TOKEN)).toEqual(
				expected,
			);
		}
	});
});

describe("revokeDevice", () => {
	it("REQ-007 AC-28: revoke deletes the device by id", async () => {
		const { signal } = new AbortController();
		const ok = unreadable(204);

		expect(await revokeDevice(ok.request, signal, SERVER, TOKEN, ID)).toEqual({
			ok: true,
		});
		expect(ok.calls).toEqual([
			{
				url: `https://tasks.example/tokens/${ID}`,
				init: {
					method: "DELETE",
					headers: { authorization: `Bearer ${TOKEN}` },
					redirect: "error",
					signal,
				},
			},
		]);
		expect(ok.calls[0]?.init.signal).toBe(signal);

		const encoded = unreadable(204);
		await revokeDevice(encoded.request, signal, SERVER, TOKEN, "a/b?c");
		expect(encoded.calls.map((call) => call.url)).toEqual([
			"https://tasks.example/tokens/a%2Fb%3Fc",
		]);

		const cases: [ReturnType<typeof fakeRequest>, object][] = [
			[refused(), UNAUTHORIZED],
			[unreadable(500), INVALID],
			[unreadable(200), INVALID],
			[failing(), UNREACHABLE],
		];
		for (const [fake, expected] of cases) {
			expect(
				await revokeDevice(fake.request, signal, SERVER, TOKEN, ID),
			).toEqual(expected);
		}
	});
});

describe("a 401", () => {
	it.each<[string, (request: RequestFn, signal: AbortSignal) => unknown]>([
		[
			"currentDevice",
			(request, signal) => currentDevice(request, signal, SERVER, TOKEN),
		],
		[
			"mintDevice",
			(request, signal) => mintDevice(request, signal, SERVER, TOKEN),
		],
		[
			"revokeDevice",
			(request, signal) => revokeDevice(request, signal, SERVER, TOKEN, ID),
		],
	])(
		"REQ-007 AC-28: only the server's own 401 means the token is refused (%s)",
		async (_name, call) => {
			const { signal } = new AbortController();
			const cases: [string, ReturnType<typeof fakeRequest>, object][] = [
				["the server's body", refused(), UNAUTHORIZED],
				["no body", unreadable(401), INVALID],
				["an empty object", answers(401, {}), INVALID],
				["another error", answers(401, { error: "other" }), INVALID],
			];
			for (const [name, fake, expected] of cases) {
				expect(await call(fake.request, signal), name).toEqual(expected);
			}
		},
	);
});
