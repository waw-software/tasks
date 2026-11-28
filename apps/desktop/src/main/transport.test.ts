import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTransport, DEFAULT_TIMEOUT_MS } from "./transport";
import type { DesktopFetch, HttpReply, RequestFn } from "./types";

type FetchInit = Parameters<DesktopFetch>[1];

const URL_UNDER_TEST = "https://tasks.example/health";
const UNREACHABLE = { ok: false, error: "unreachable" };

function fakeFetch(reply: (init: FetchInit) => Promise<HttpReply>) {
	const calls: { url: string; init: FetchInit }[] = [];
	const fetch: DesktopFetch = (url, init) => {
		calls.push({ url, init });
		return reply(init);
	};
	return { fetch, calls };
}

/** Settles only by rejecting, when the signal aborts. */
function pendingUntilAbort<T>(signal: AbortSignal): Promise<T> {
	return new Promise((_resolve, reject) => {
		const fail = () => reject(new Error("aborted"));
		if (signal.aborted) fail();
		else signal.addEventListener("abort", fail, { once: true });
	});
}

const get = (request: RequestFn, signal: AbortSignal) =>
	request(URL_UNDER_TEST, {
		method: "GET",
		headers: { accept: "application/json" },
		redirect: "error",
		signal,
	});

/** Records the result without waiting for it, so a test can see "not yet". */
function track<T>(promise: Promise<T>) {
	const state: { result: T | undefined } = { result: undefined };
	void promise.then((result) => {
		state.result = result;
	});
	return state;
}

describe("createTransport", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("REQ-007 AC-28: every request omits credentials, refuses redirects and skips the cache", async () => {
		const { fetch, calls } = fakeFetch(async () => ({
			status: 204,
			json: async () => null,
		}));
		let exchangeSignal: AbortSignal | undefined;

		const result = await createTransport(fetch).run(async (request, signal) => {
			exchangeSignal = signal;
			const reply = await get(request, signal);
			return { ok: true as const, status: reply.status };
		});

		expect(result).toEqual({ ok: true, status: 204 });
		expect(calls).toEqual([
			{
				url: URL_UNDER_TEST,
				init: {
					method: "GET",
					headers: { accept: "application/json" },
					redirect: "error",
					credentials: "omit",
					cache: "no-store",
					signal: exchangeSignal,
				},
			},
		]);
		expect(calls[0]?.init.signal).toBe(exchangeSignal);
		expect(exchangeSignal?.aborted).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("REQ-007 AC-28: a server that does not answer in time is unreachable", async () => {
		const { fetch } = fakeFetch((init) => pendingUntilAbort(init.signal));

		const state = track(createTransport(fetch, 10).run(get));

		await vi.advanceTimersByTimeAsync(9);
		expect(state.result).toBeUndefined();
		await vi.advanceTimersByTimeAsync(1);
		expect(state.result).toEqual(UNREACHABLE);
	});

	it("REQ-007 AC-28: a body that stalls past the timeout is unreachable, not invalid-response", async () => {
		const { fetch } = fakeFetch(async (init) => ({
			status: 200,
			json: () => pendingUntilAbort(init.signal),
		}));
		let exchangeOutcome: unknown;

		const state = track(
			createTransport(fetch, 10).run(async (request, signal) => {
				const reply = await get(request, signal);
				try {
					await reply.json();
					return { ok: true as const };
				} catch {
					exchangeOutcome = "invalid-response";
					return { ok: false as const, error: "invalid-response" as const };
				}
			}),
		);

		await vi.advanceTimersByTimeAsync(10);
		expect(exchangeOutcome).toBe("invalid-response");
		expect(state.result).toEqual(UNREACHABLE);
	});

	it("REQ-007 AC-28: a thrown error leaves no text in the result", async () => {
		const { fetch } = fakeFetch(async () => {
			throw new Error(`waw_dev_${"A".repeat(43)}`);
		});

		const result = await createTransport(fetch).run(get);

		expect(result).toStrictEqual(UNREACHABLE);
		expect(JSON.stringify(result)).not.toContain("waw_dev_");
		expect(vi.getTimerCount()).toBe(0);
	});

	it("REQ-007 AC-28: a per-call timeout overrides the default", async () => {
		const { fetch } = fakeFetch((init) => pendingUntilAbort(init.signal));
		const transport = createTransport(fetch);

		const overridden = track(transport.run(get, { timeoutMs: 10 }));
		const byDefault = track(transport.run(get));

		await vi.advanceTimersByTimeAsync(10);
		expect(overridden.result).toEqual(UNREACHABLE);
		expect(byDefault.result).toBeUndefined();

		expect(DEFAULT_TIMEOUT_MS).toBe(10_000);
		await vi.advanceTimersByTimeAsync(9_989);
		expect(byDefault.result).toBeUndefined();
		await vi.advanceTimersByTimeAsync(1);
		expect(byDefault.result).toEqual(UNREACHABLE);
	});
});
