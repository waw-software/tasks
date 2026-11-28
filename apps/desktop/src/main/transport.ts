import type { DesktopFetch, Failure, RequestFn, Transport } from "./types";

export const DEFAULT_TIMEOUT_MS = 10_000;

const unreachable = (): Failure => ({ ok: false, error: "unreachable" });

export function createTransport(
	fetch: DesktopFetch,
	timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Transport {
	const request: RequestFn = (url, init) =>
		fetch(url, {
			...init,
			redirect: "error",
			credentials: "omit",
			cache: "no-store",
		});

	return {
		async run(exchange, options) {
			const controller = new AbortController();
			const timer = setTimeout(
				() => controller.abort(),
				options?.timeoutMs ?? timeoutMs,
			);
			try {
				const result = await exchange(request, controller.signal);
				// A body read cut by the timeout can look like an invalid response.
				return controller.signal.aborted ? unreachable() : result;
			} catch {
				// The thrown error is dropped: it can name the URL or a header.
				return unreachable();
			} finally {
				clearTimeout(timer);
			}
		},
	};
}
