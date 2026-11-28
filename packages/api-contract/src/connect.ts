// The connect client of every app. No TypeBox at runtime and no platform types:
// each app passes its own fetch and abort signal.
import {
	decodeDeviceCredential,
	decodeDeviceIdentity,
	decodeHealth,
} from "./client-values.js";
import {
	DEVICE_TOKEN_PATTERN,
	PAIRING_TOKEN_PATTERN,
} from "./credential-patterns.js";
import type { HealthResponse } from "./health.js";

export {
	decodeDeviceCredential,
	decodeDeviceIdentity,
	decodeHealth,
} from "./client-values.js";
export * from "./compatibility.js";
export type { HealthResponse } from "./health.js";

// The WHATWG URL that every client runtime has; the package compiles without its types.
declare const URL: new (
	url: string,
) => { readonly origin: string; readonly host: string };

export type ConnectInput =
	| { kind: "manual"; serverUrl: string; token: string }
	| { kind: "pairing"; link: string };

export type SavedConnection = { serverUrl: string; token: string };

export type ConnectionView = {
	serverUrl: string;
	health: HealthResponse;
	persisted: boolean;
	limitedAccepted: boolean;
};

export type ConnectError =
	| "invalid-address"
	| "https-required"
	| "invalid-token"
	| "invalid-pairing-link"
	| "unreachable"
	| "invalid-response"
	| "unauthorized"
	| "pairing-rejected"
	| "csrf-forbidden"
	| "storage";

export type ConnectResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: ConnectError; health?: HealthResponse };

export type ConnectFetch<Signal> = (
	url: string,
	init: {
		method: "GET" | "POST";
		headers: Record<string, string>;
		body?: string;
		redirect: "error";
		signal: Signal;
	},
) => Promise<{ status: number; json(): Promise<unknown> }>;

export type ConnectAdapter = {
	load(): Promise<ConnectResult<ConnectionView | null>>;
	submit(input: ConnectInput): Promise<ConnectResult<ConnectionView>>;
	recheck(): Promise<ConnectResult<ConnectionView>>;
	acknowledgeLimited(): Promise<ConnectResult<ConnectionView>>;
};

export type WebConnectAdapter = ConnectAdapter & {
	signOut(): Promise<ConnectResult<null>>;
};

export type ServerProbe = { serverUrl: string; health: HealthResponse };

/** What the desktop preload exposes as window.wawDesktop. */
export type DesktopBridge = {
	connect: WebConnectAdapter & {
		/** Health of the server named by a URL or a pairing link; sends no secret. */
		probe(text: string): Promise<ConnectResult<ServerProbe>>;
	};
};

const LOOPBACK_HOST = /^(?:localhost|\[::1\]|127(?:\.\d{1,3}){3})(?::\d+)?$/i;

// Checked on the raw text: URL would silently drop an empty query, fragment or
// user info, resolve dot segments, add missing slashes and strip newlines.
const ORIGIN_SHAPE = /^https?:\/\/[^/\\?#@\s]+\/?$/i;

// Only the scheme and the host ignore case; the path and the fragment are exact.
const PAIRING_LINK_SHAPE =
	/^[Hh][Tt][Tt][Pp][Ss]:\/\/([^/\\?#@\s]+)\/pair#token=(.*)$/;

const deviceToken = new RegExp(DEVICE_TOKEN_PATTERN);
const pairingToken = new RegExp(PAIRING_TOKEN_PATTERN);

function failure(
	error: ConnectError,
	health?: HealthResponse,
): { ok: false; error: ConnectError; health?: HealthResponse } {
	return health === undefined
		? { ok: false, error }
		: { ok: false, error, health };
}

function parseUrl(raw: string): InstanceType<typeof URL> | null {
	try {
		return new URL(raw);
	} catch {
		return null;
	}
}

/** `host` is a URL host, with its port when it has one. */
export function isLoopbackHost(host: string): boolean {
	return LOOPBACK_HOST.test(host);
}

export function isDeviceToken(value: string): boolean {
	return deviceToken.test(value);
}

export function normalizeServerOrigin(raw: string): ConnectResult<string> {
	const text = raw.trim();
	const url = ORIGIN_SHAPE.test(text) ? parseUrl(text) : null;
	if (url === null) return failure("invalid-address");
	if (url.origin.startsWith("http:") && !isLoopbackHost(url.host)) {
		return failure("https-required");
	}
	return { ok: true, value: url.origin };
}

export function parsePairingLink(
	link: string,
): ConnectResult<{ origin: string; token: string }> {
	const [, host, token] = PAIRING_LINK_SHAPE.exec(link.trim()) ?? [];
	const url = host === undefined ? null : parseUrl(`https://${host}`);
	if (url === null || token === undefined || !pairingToken.test(token)) {
		return failure("invalid-pairing-link");
	}
	return { ok: true, value: { origin: url.origin, token } };
}

type Reply = { status: number; body: unknown };

/**
 * One request that follows no redirect. The body is read only on `bodyStatus`;
 * it stays undefined when it is not JSON, which no decoder accepts.
 * The thrown error is dropped: it can name the URL or a header.
 */
async function request<S>(
	fetcher: ConnectFetch<S>,
	url: string,
	init: Omit<Parameters<ConnectFetch<S>>[1], "redirect">,
	bodyStatus: number,
): Promise<Reply | null> {
	let response: Awaited<ReturnType<ConnectFetch<S>>>;
	try {
		response = await fetcher(url, { ...init, redirect: "error" });
	} catch {
		return null;
	}
	const { status } = response;
	if (status !== bodyStatus) return { status, body: undefined };
	try {
		return { status, body: await response.json() };
	} catch {
		return { status, body: undefined };
	}
}

export async function probeHealth<S>(
	origin: string,
	fetcher: ConnectFetch<S>,
	signal: S,
): Promise<ConnectResult<HealthResponse>> {
	const reply = await request(
		fetcher,
		`${origin}/health`,
		{ method: "GET", headers: { accept: "application/json" }, signal },
		200,
	);
	if (reply === null) return failure("unreachable");
	const health = decodeHealth(reply.body);
	return health === null
		? failure("invalid-response")
		: { ok: true, value: health };
}

async function connectWithToken<S>(
	serverUrl: string,
	token: string,
	fetcher: ConnectFetch<S>,
	signal: S,
): Promise<ConnectResult<SavedConnection & { health: HealthResponse }>> {
	const probe = await probeHealth(serverUrl, fetcher, signal);
	if (!probe.ok) return probe;
	const health = probe.value;
	const reply = await request(
		fetcher,
		`${serverUrl}/tokens/current`,
		{
			method: "GET",
			headers: {
				accept: "application/json",
				authorization: `Bearer ${token}`,
			},
			signal,
		},
		200,
	);
	if (reply === null) return failure("unreachable");
	if (reply.status === 401) return failure("unauthorized", health);
	if (decodeDeviceIdentity(reply.body) === null) {
		return failure("invalid-response");
	}
	return { ok: true, value: { serverUrl, token, health } };
}

async function redeemPairing<S>(
	serverUrl: string,
	pairing: string,
	fetcher: ConnectFetch<S>,
	signal: S,
): Promise<ConnectResult<SavedConnection & { health: HealthResponse }>> {
	const probe = await probeHealth(serverUrl, fetcher, signal);
	if (!probe.ok) return probe;
	const health = probe.value;
	const reply = await request(
		fetcher,
		`${serverUrl}/tokens/pairing/redeem`,
		{
			method: "POST",
			headers: {
				accept: "application/json",
				"content-type": "application/json",
			},
			body: JSON.stringify({ token: pairing }),
			signal,
		},
		201,
	);
	if (reply === null) return failure("unreachable");
	if (reply.status === 401) return failure("pairing-rejected", health);
	const credential = decodeDeviceCredential(reply.body);
	if (credential === null) return failure("invalid-response");
	return { ok: true, value: { serverUrl, token: credential.token, health } };
}

/** Sends a secret only to a valid origin that has just passed the public health check. */
export async function connect<S>(
	input: ConnectInput,
	fetcher: ConnectFetch<S>,
	signal: S,
): Promise<ConnectResult<SavedConnection & { health: HealthResponse }>> {
	if (input.kind === "pairing") {
		const link = parsePairingLink(input.link);
		if (!link.ok) return link;
		return redeemPairing(link.value.origin, link.value.token, fetcher, signal);
	}
	const origin = normalizeServerOrigin(input.serverUrl);
	if (!origin.ok) return origin;
	const token = input.token.trim();
	if (!isDeviceToken(token)) return failure("invalid-token");
	return connectWithToken(origin.value, token, fetcher, signal);
}
