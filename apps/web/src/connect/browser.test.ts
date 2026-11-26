import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createBrowserConnectAdapter,
	defaultBrowserConnectAdapter,
	LIMITED_ACK_KEY,
} from "./browser.ts";

const origin = "https://tasks.example.com";
const token = `waw_dev_${"A".repeat(43)}`;
const id = "3f2b8c1e-9a4d-4e6b-8c2a-1d5f7a9b0c3e";

type Answer = { status: number; body?: unknown } | Error;

const identity: Answer = { status: 200, body: { id } };
const created: Answer = { status: 201, body: { id } };

function healthWith(...capabilities: string[]): Answer {
	return { status: 200, body: { apiVersion: 1, capabilities } };
}

/** Answers the requests in order and records each one. */
function fakeFetcher(...answers: Answer[]) {
	const calls: { url: string; init: RequestInit }[] = [];
	const fetcher = async (url: string, init: RequestInit) => {
		calls.push({ url, init });
		const answer = answers.shift();
		if (answer === undefined) throw new Error("unexpected request");
		if (answer instanceof Error) throw answer;
		return {
			status: answer.status,
			json: async () => {
				if (answer.body === undefined) throw new SyntaxError("no body");
				return answer.body;
			},
		};
	};
	return { calls, answers, fetcher };
}

function fakeStorage(entries: Record<string, string> = {}) {
	const map = new Map(Object.entries(entries));
	return {
		map,
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => void map.set(key, value),
		removeItem: (key: string) => void map.delete(key),
	};
}

const refusingStorage = {
	getItem: (): string | null => {
		throw new Error("denied");
	},
	setItem: () => {
		throw new Error("denied");
	},
	removeItem: () => {
		throw new Error("denied");
	},
};

function requests(calls: { url: string; init: RequestInit }[]) {
	return calls.map(({ url, init }) => `${init.method} ${url}`);
}

function sentHeaders(init: RequestInit | undefined) {
	return Object.fromEntries(new Headers(init?.headers));
}

function viewWith(capabilities: string[], limitedAccepted = false) {
	return {
		ok: true,
		value: {
			serverUrl: origin,
			health: { apiVersion: 1, capabilities },
			persisted: true,
			limitedAccepted,
		},
	};
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("browser connect adapter", () => {
	it("REQ-007 AC-28 restores the session by cookie", async () => {
		const { calls, fetcher } = fakeFetcher(identity, healthWith("connect"));
		const adapter = createBrowserConnectAdapter(origin, fetcher, fakeStorage());

		expect(await adapter.load()).toEqual(viewWith(["connect"]));
		expect(requests(calls)).toEqual([
			`GET ${origin}/tokens/current`,
			`GET ${origin}/health`,
		]);
		expect(sentHeaders(calls[0]?.init)).not.toHaveProperty("authorization");
		for (const { init } of calls) {
			expect(init.credentials).toBe("same-origin");
			expect(init.redirect).toBe("error");
			expect(init.cache).toBe("no-store");
			expect(init.signal).toBeInstanceOf(AbortSignal);
		}
	});

	it("REQ-007 AC-28 has no session to restore on 401", async () => {
		const { calls, fetcher } = fakeFetcher({ status: 401 });
		const adapter = createBrowserConnectAdapter(origin, fetcher, fakeStorage());

		expect(await adapter.load()).toEqual({ ok: true, value: null });
		expect(requests(calls)).toEqual([`GET ${origin}/tokens/current`]);
	});

	it("REQ-007 AC-28 signs in with the owner token only for the exchange", async () => {
		const { calls, fetcher } = fakeFetcher(healthWith("connect"), created);
		const storage = fakeStorage();
		const adapter = createBrowserConnectAdapter(origin, fetcher, storage);

		const result = await adapter.submit({
			kind: "manual",
			serverUrl: `${origin}/`,
			token: ` ${token}\n`,
		});

		expect(result).toEqual(viewWith(["connect"]));
		expect(requests(calls)).toEqual([
			`GET ${origin}/health`,
			`POST ${origin}/session`,
		]);
		expect(sentHeaders(calls[0]?.init)).not.toHaveProperty("authorization");
		expect(sentHeaders(calls[1]?.init).authorization).toBe(`Bearer ${token}`);
		expect(calls[1]?.init.body).toBeUndefined();
		expect(calls[1]?.init.credentials).toBe("same-origin");
		expect(calls[1]?.init.redirect).toBe("error");
		expect(calls[1]?.init.cache).toBe("no-store");
		await adapter.acknowledgeLimited();
		expect(JSON.stringify([...storage.map])).not.toContain(token);
		expect(JSON.stringify(result)).not.toContain(token);
	});

	it("REQ-007 AC-28 refuses a wrong or foreign input before any request", async () => {
		const { calls, fetcher } = fakeFetcher();
		const adapter = createBrowserConnectAdapter(origin, fetcher, fakeStorage());

		expect(
			await adapter.submit({
				kind: "manual",
				serverUrl: origin,
				token: "waw_dev_short",
			}),
		).toEqual({ ok: false, error: "invalid-token" });
		expect(
			await adapter.submit({
				kind: "manual",
				serverUrl: "https://other.example.com",
				token,
			}),
		).toEqual({ ok: false, error: "invalid-address" });
		expect(
			await adapter.submit({
				kind: "pairing",
				link: `${origin}/pair#token=waw_pair_${"A".repeat(43)}`,
			}),
		).toEqual({ ok: false, error: "invalid-pairing-link" });
		expect(calls).toEqual([]);
	});

	it("REQ-007 AC-28 never sends the token from a remote http page", async () => {
		const remote = "http://tasks.example.com";
		const { calls, fetcher } = fakeFetcher();
		const adapter = createBrowserConnectAdapter(remote, fetcher, fakeStorage());

		expect(
			await adapter.submit({ kind: "manual", serverUrl: remote, token }),
		).toEqual({ ok: false, error: "https-required" });
		expect(calls).toEqual([]);
	});

	describe("maps refusals and failures", () => {
		const offline = new TypeError("offline");

		it.each<[string, Answer[], string]>([
			[
				"403 https_required",
				[{ status: 403, body: { error: "https_required" } }],
				"https-required",
			],
			[
				"403 csrf_forbidden",
				[{ status: 403, body: { error: "csrf_forbidden" } }],
				"csrf-forbidden",
			],
			["403 without a body", [{ status: 403 }], "csrf-forbidden"],
			["a thrown request", [offline], "unreachable"],
			["500", [{ status: 500 }], "invalid-response"],
			[
				"200 without an identity",
				[{ status: 200, body: { id: "x" } }],
				"invalid-response",
			],
			["a failed health check", [identity, offline], "unreachable"],
			[
				"an invalid health reply",
				[identity, { status: 200, body: {} }],
				"invalid-response",
			],
		])("on load and recheck: %s", async (_name, answers, error) => {
			const { fetcher } = fakeFetcher(...answers, ...answers);
			const adapter = createBrowserConnectAdapter(origin, fetcher, null);

			expect(await adapter.load()).toEqual({ ok: false, error });
			expect(await adapter.recheck()).toEqual({ ok: false, error });
		});

		const health = { apiVersion: 1, capabilities: ["connect"] };

		it.each<[string, Answer, object]>([
			["401", { status: 401 }, { error: "unauthorized", health }],
			[
				"403 https_required",
				{ status: 403, body: { error: "https_required" } },
				{ error: "https-required" },
			],
			[
				"403 csrf_forbidden",
				{ status: 403, body: { error: "csrf_forbidden" } },
				{ error: "csrf-forbidden" },
			],
			["a thrown request", offline, { error: "unreachable" }],
			["200", { status: 200, body: { id } }, { error: "invalid-response" }],
		])("on sign-in: %s", async (_name, answer, expected) => {
			const { fetcher } = fakeFetcher(healthWith("connect"), answer);
			const adapter = createBrowserConnectAdapter(origin, fetcher, null);

			expect(
				await adapter.submit({ kind: "manual", serverUrl: origin, token }),
			).toEqual({ ok: false, ...expected });
		});

		it.each<[string, Answer]>([
			["an empty object", { status: 201, body: {} }],
			["a malformed id", { status: 201, body: { id: "x" } }],
			["an unreadable body", { status: 201 }],
		])(
			"REQ-007 AC-28 a sign-in answer without a valid identity is refused: %s",
			async (_name, answer) => {
				const { fetcher } = fakeFetcher(healthWith("connect"), answer);
				const adapter = createBrowserConnectAdapter(origin, fetcher, null);

				expect(
					await adapter.submit({ kind: "manual", serverUrl: origin, token }),
				).toEqual({ ok: false, error: "invalid-response" });
				expect(await adapter.acknowledgeLimited()).toEqual({
					ok: false,
					error: "invalid-response",
				});
			},
		);

		it("sends no secret when the health check fails", async () => {
			const { calls, fetcher } = fakeFetcher(offline);
			const adapter = createBrowserConnectAdapter(origin, fetcher, null);

			expect(
				await adapter.submit({ kind: "manual", serverUrl: origin, token }),
			).toEqual({ ok: false, error: "unreachable" });
			expect(requests(calls)).toEqual([`GET ${origin}/health`]);
		});

		it("opens the active session on 409", async () => {
			const { calls, fetcher } = fakeFetcher(
				healthWith("connect"),
				{ status: 409, body: { error: "session_active" } },
				identity,
				healthWith("connect"),
			);
			const adapter = createBrowserConnectAdapter(origin, fetcher, null);

			expect(
				await adapter.submit({ kind: "manual", serverUrl: origin, token }),
			).toEqual(viewWith(["connect"]));
			expect(requests(calls).slice(2)).toEqual([
				`GET ${origin}/tokens/current`,
				`GET ${origin}/health`,
			]);
		});

		it.each<[string, Answer]>([
			["is gone", { status: 401 }],
			["cannot be read", offline],
		])("is unauthorized on 409 when the session %s", async (_name, answer) => {
			const { fetcher } = fakeFetcher(
				healthWith("connect"),
				{ status: 409 },
				answer,
			);
			const adapter = createBrowserConnectAdapter(origin, fetcher, null);

			expect(
				await adapter.submit({ kind: "manual", serverUrl: origin, token }),
			).toEqual({ ok: false, error: "unauthorized" });
		});

		it("is unauthorized when a recheck finds no session", async () => {
			const { fetcher } = fakeFetcher(identity, healthWith(), { status: 401 });
			const adapter = createBrowserConnectAdapter(origin, fetcher, null);
			await adapter.load();

			expect(await adapter.recheck()).toEqual({
				ok: false,
				error: "unauthorized",
			});
			expect(await adapter.acknowledgeLimited()).toEqual({
				ok: false,
				error: "invalid-response",
			});
		});

		it.each<[string, number | undefined, number]>([
			["the default 10 s", undefined, 10_000],
			["the given time", 500, 500],
		])("aborts a request after %s", async (_name, timeoutMs, limit) => {
			vi.useFakeTimers();
			const hanging = (_url: string, init: RequestInit) =>
				new Promise<never>((_resolve, reject) => {
					init.signal?.addEventListener("abort", () =>
						reject(new Error("aborted")),
					);
				});
			const adapter = createBrowserConnectAdapter(
				origin,
				hanging,
				null,
				timeoutMs === undefined ? undefined : { timeoutMs },
			);
			let result: unknown = "pending";
			void adapter.load().then((value) => {
				result = value;
			});

			await vi.advanceTimersByTimeAsync(limit - 1);
			expect(result).toBe("pending");
			await vi.advanceTimersByTimeAsync(1);
			expect(result).toEqual({ ok: false, error: "unreachable" });
		});

		it("aborts a reply body that never ends", async () => {
			vi.useFakeTimers();
			const stalled = async (_url: string, init: RequestInit) => ({
				status: 200,
				json: () =>
					new Promise<never>((_resolve, reject) => {
						init.signal?.addEventListener("abort", () =>
							reject(new Error("aborted")),
						);
					}),
			});
			const adapter = createBrowserConnectAdapter(origin, stalled, null, {
				timeoutMs: 500,
			});
			const result = adapter.load();

			await vi.advanceTimersByTimeAsync(500);

			expect(await result).toEqual({ ok: false, error: "unreachable" });
		});
	});

	it("REQ-010 AC-35 remembers limited mode for the same capability set and forgets it on change", async () => {
		const storage = fakeStorage();
		const { fetcher } = fakeFetcher(
			identity,
			healthWith("future-x"),
			identity,
			healthWith("future-x", "future-x"),
			identity,
			healthWith("future-y"),
			identity,
			healthWith("future-x"),
		);
		const adapter = () => createBrowserConnectAdapter(origin, fetcher, storage);
		const first = adapter();
		await first.load();

		expect(await first.acknowledgeLimited()).toEqual(
			viewWith(["future-x"], true),
		);
		expect([...storage.map]).toEqual([
			[
				"waw.connect.limited.v1",
				'{"serverUrl":"https://tasks.example.com","capabilityKey":"[\\"future-x\\"]"}',
			],
		]);
		expect(await adapter().load()).toEqual(
			viewWith(["future-x", "future-x"], true),
		);
		expect(await adapter().load()).toEqual(viewWith(["future-y"]));
		expect(storage.map.has(LIMITED_ACK_KEY)).toBe(false);
		expect(await adapter().load()).toEqual(viewWith(["future-x"]));
	});

	it("REQ-010 AC-35 neither accepts nor removes another origin's record", async () => {
		const record =
			'{"serverUrl":"https://other.example.com","capabilityKey":"[]"}';
		const storage = fakeStorage({ [LIMITED_ACK_KEY]: record });
		const { fetcher } = fakeFetcher(identity, healthWith());
		const adapter = createBrowserConnectAdapter(origin, fetcher, storage);

		expect(await adapter.load()).toEqual(viewWith([]));
		expect(storage.map.get(LIMITED_ACK_KEY)).toBe(record);
	});

	it.each([
		"not json",
		"null",
		'"text"',
		'{"serverUrl":"https://tasks.example.com"}',
		'{"serverUrl":1,"capabilityKey":"[]"}',
	])("REQ-010 AC-35 removes the unreadable record %s", async (record) => {
		const storage = fakeStorage({ [LIMITED_ACK_KEY]: record });
		const { fetcher } = fakeFetcher(identity, healthWith());
		const adapter = createBrowserConnectAdapter(origin, fetcher, storage);

		expect(await adapter.load()).toEqual(viewWith([]));
		expect(storage.map.has(LIMITED_ACK_KEY)).toBe(false);
	});

	it.each([
		["refuses every call", refusingStorage],
		["is absent", null],
	])(
		"REQ-010 AC-35 keeps limited mode in memory when storage %s",
		async (_name, storage) => {
			const { fetcher } = fakeFetcher(
				identity,
				healthWith("future-x"),
				identity,
				healthWith("future-x"),
				identity,
				healthWith("future-y"),
				identity,
				healthWith("future-x"),
			);
			const adapter = createBrowserConnectAdapter(origin, fetcher, storage);
			await adapter.load();

			expect(await adapter.acknowledgeLimited()).toEqual(
				viewWith(["future-x"], true),
			);
			expect(await adapter.recheck()).toEqual(viewWith(["future-x"], true));
			expect(await adapter.recheck()).toEqual(viewWith(["future-y"]));
			expect(await adapter.recheck()).toEqual(viewWith(["future-x"]));
		},
	);

	it("REQ-010 AC-35 acknowledges nothing before a successful check", async () => {
		const storage = fakeStorage();
		const { fetcher } = fakeFetcher();
		const adapter = createBrowserConnectAdapter(origin, fetcher, storage);

		expect(await adapter.acknowledgeLimited()).toEqual({
			ok: false,
			error: "invalid-response",
		});
		expect(storage.map.size).toBe(0);
	});

	it("REQ-007 AC-28 sign-out forgets the view only on success", async () => {
		const { calls, answers, fetcher } = fakeFetcher(identity, healthWith());
		const adapter = createBrowserConnectAdapter(origin, fetcher, fakeStorage());
		await adapter.load();

		const refusals: [Answer, string][] = [
			[{ status: 403, body: { error: "csrf_forbidden" } }, "csrf-forbidden"],
			[{ status: 403, body: { error: "https_required" } }, "https-required"],
			[{ status: 500 }, "unreachable"],
			[new TypeError("offline"), "unreachable"],
		];
		for (const [answer, error] of refusals) {
			answers.push(answer);
			expect(await adapter.signOut()).toEqual({ ok: false, error });
			expect(await adapter.acknowledgeLimited()).toEqual(viewWith([], true));
		}

		answers.push({ status: 204 });
		expect(await adapter.signOut()).toEqual({ ok: true, value: null });
		const last = calls.at(-1);
		expect(`${last?.init.method} ${last?.url}`).toBe(
			`DELETE ${origin}/session`,
		);
		expect(sentHeaders(last?.init)).not.toHaveProperty("authorization");
		expect(last?.init.credentials).toBe("same-origin");
		expect(await adapter.acknowledgeLimited()).toEqual({
			ok: false,
			error: "invalid-response",
		});
	});

	it("REQ-007 AC-28 the default adapter uses the page's origin and fetch", async () => {
		const { calls, fetcher } = fakeFetcher({ status: 401 });
		vi.stubGlobal("fetch", fetcher);

		expect(await defaultBrowserConnectAdapter().load()).toEqual({
			ok: true,
			value: null,
		});
		expect(requests(calls)).toEqual([
			`GET ${window.location.origin}/tokens/current`,
		]);
	});
});
