import type { DesktopFetch, Transport } from "./types";

export const DEFAULT_TIMEOUT_MS = 10_000;

export function createTransport(
	_fetch: DesktopFetch,
	_timeoutMs?: number,
): Transport {
	throw new Error("not implemented: createTransport");
}
