// The web app's session: an HttpOnly cookie of this origin. The owner's token is
// sent once, to get that cookie, and is kept nowhere.
import {
	type ConnectError,
	type ConnectFetch,
	type ConnectionView,
	type ConnectResult,
	capabilityKey,
	decodeDeviceIdentity,
	type HealthResponse,
	isDeviceToken,
	type LimitedAck,
	normalizeServerOrigin,
	probeHealth,
	reconcileLimitedAck,
	type WebConnectAdapter,
} from "@waw/api-contract/connect";

type BrowserFetch = (
	url: string,
	init: RequestInit,
) => Promise<{ status: number; json(): Promise<unknown> }>;

type AckStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const LIMITED_ACK_KEY = "waw.connect.limited.v1";

type Failure = { ok: false; error: ConnectError; health?: HealthResponse };

function failure(error: ConnectError, health?: HealthResponse): Failure {
	return health === undefined
		? { ok: false, error }
		: { ok: false, error, health };
}

function parseAck(text: string): LimitedAck | null {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return null;
	}
	if (typeof value !== "object" || value === null) return null;
	const { serverUrl, capabilityKey } = value as Record<string, unknown>;
	return typeof serverUrl === "string" && typeof capabilityKey === "string"
		? { serverUrl, capabilityKey }
		: null;
}

/** The record of this tab. When storage fails, it lives in memory instead. */
function ackStore(storage: AckStorage | null) {
	let memory: LimitedAck | null = null;
	function remove(): void {
		memory = null;
		try {
			storage?.removeItem(LIMITED_ACK_KEY);
		} catch {
			// A storage that refuses every call holds no record to remove.
		}
	}
	return {
		remove,
		read(): LimitedAck | null {
			if (memory !== null) return memory;
			let text: string | null;
			try {
				text = storage?.getItem(LIMITED_ACK_KEY) ?? null;
			} catch {
				return null;
			}
			if (text === null) return null;
			const ack = parseAck(text);
			if (ack === null) remove();
			return ack;
		},
		write(ack: LimitedAck): void {
			memory = ack;
			if (storage === null) return;
			try {
				storage.setItem(LIMITED_ACK_KEY, JSON.stringify(ack));
				memory = null;
			} catch {
				// The record stays in memory for this adapter.
			}
		},
	};
}

async function refusal(response: {
	json(): Promise<unknown>;
}): Promise<ConnectError> {
	try {
		const body = (await response.json()) as { error?: unknown } | null;
		if (body?.error === "https_required") return "https-required";
	} catch {
		// A 403 without a readable body is a refused origin.
	}
	return "csrf-forbidden";
}

async function checkIdentity(response: {
	json(): Promise<unknown>;
}): Promise<Failure | null> {
	const body = await response.json().catch(() => undefined);
	return decodeDeviceIdentity(body) === null
		? failure("invalid-response")
		: null;
}

export function createBrowserConnectAdapter(
	origin: string,
	fetcher: BrowserFetch,
	storage: AckStorage | null,
	options: { timeoutMs?: number } = {},
): WebConnectAdapter {
	const timeoutMs = options.timeoutMs ?? 10_000;
	const acks = ackStore(storage);
	// The last successfully checked state of this session.
	let current: ConnectionView | null = null;

	/** The signal covers the whole exchange, the reading of the body included. */
	async function bounded<T>(
		exchange: (signal: AbortSignal) => Promise<T>,
	): Promise<T> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await exchange(controller.signal);
		} finally {
			clearTimeout(timer);
		}
	}

	const send: ConnectFetch<AbortSignal> = (url, init) =>
		fetcher(url, { ...init, credentials: "same-origin", cache: "no-store" });

	/** The thrown error is dropped: it can name the URL or a header. */
	async function request<T>(
		path: string,
		method: "GET" | "POST" | "DELETE",
		headers: Record<string, string>,
		read: (response: Awaited<ReturnType<BrowserFetch>>) => Promise<T>,
	): Promise<T | Failure> {
		try {
			return await bounded(async (signal) => {
				const response = await fetcher(`${origin}${path}`, {
					method,
					headers,
					credentials: "same-origin",
					redirect: "error",
					cache: "no-store",
					signal,
				});
				const result = await read(response);
				return signal.aborted ? failure("unreachable") : result;
			});
		} catch {
			return failure("unreachable");
		}
	}

	function health(): Promise<ConnectResult<HealthResponse>> {
		return bounded((signal) => probeHealth(origin, send, signal));
	}

	function accept(checked: HealthResponse): ConnectResult<ConnectionView> {
		const { accepted, clear } = reconcileLimitedAck(
			acks.read(),
			origin,
			checked,
		);
		if (clear) acks.remove();
		current = {
			serverUrl: origin,
			health: checked,
			persisted: true,
			limitedAccepted: accepted,
		};
		return { ok: true, value: current };
	}

	async function recheck(): Promise<ConnectResult<ConnectionView>> {
		const identity = await request(
			"/tokens/current",
			"GET",
			{ accept: "application/json" },
			async (response): Promise<Failure | null> => {
				if (response.status === 401) return failure("unauthorized");
				if (response.status === 403) return failure(await refusal(response));
				if (response.status !== 200) return failure("invalid-response");
				return checkIdentity(response);
			},
		);
		if (identity !== null) {
			if (identity.error === "unauthorized") current = null;
			return identity;
		}
		const probe = await health();
		return probe.ok ? accept(probe.value) : probe;
	}

	async function load(): Promise<ConnectResult<ConnectionView | null>> {
		const result = await recheck();
		return !result.ok && result.error === "unauthorized"
			? { ok: true, value: null }
			: result;
	}

	return {
		load,
		recheck,
		async submit(input) {
			if (input.kind !== "manual") return failure("invalid-pairing-link");
			if (input.serverUrl.trim().replace(/\/$/, "") !== origin) {
				return failure("invalid-address");
			}
			const allowed = normalizeServerOrigin(origin);
			if (!allowed.ok) return allowed;
			const token = input.token.trim();
			if (!isDeviceToken(token)) return failure("invalid-token");

			const probe = await health();
			if (!probe.ok) return probe;
			const exchange = await request(
				"/session",
				"POST",
				{ accept: "application/json", authorization: `Bearer ${token}` },
				async (response): Promise<Failure | "created" | "active"> => {
					if (response.status === 201) {
						return (await checkIdentity(response)) ?? "created";
					}
					if (response.status === 409) return "active";
					if (response.status === 401) {
						return failure("unauthorized", probe.value);
					}
					if (response.status === 403) {
						return failure(await refusal(response));
					}
					return failure("invalid-response");
				},
			);
			if (exchange === "created") return accept(probe.value);
			if (exchange !== "active") return exchange;
			const active = await load();
			return active.ok && active.value !== null
				? { ok: true, value: active.value }
				: failure("unauthorized");
		},
		async acknowledgeLimited() {
			if (current === null) return failure("invalid-response");
			acks.write({
				serverUrl: origin,
				capabilityKey: capabilityKey(current.health),
			});
			current = { ...current, limitedAccepted: true };
			return { ok: true, value: current };
		},
		async signOut() {
			const refused = await request(
				"/session",
				"DELETE",
				{},
				async (response): Promise<Failure | null> => {
					if (response.status === 204) return null;
					if (response.status === 403) {
						return failure(await refusal(response));
					}
					return failure("unreachable");
				},
			);
			if (refused !== null) return refused;
			current = null;
			return { ok: true, value: null };
		},
	};
}

function tabStorage(): AckStorage | null {
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

export function defaultBrowserConnectAdapter(): WebConnectAdapter {
	return createBrowserConnectAdapter(
		window.location.origin,
		(url, init) => window.fetch(url, init),
		tabStorage(),
	);
}
