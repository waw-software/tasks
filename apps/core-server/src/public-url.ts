import type { FastifyRequest } from "fastify";

/** Fastify trustProxy value: loopback and private networks (the reverse proxy and the Docker network). */
export const publicAddressTrustProxy: string[] = ["loopback", "uniquelocal"];

const INVALID_PUBLIC_URL =
	"PUBLIC_URL must be an http or https origin, like https://tasks.example.com";

// Checked on the raw value: URL would silently drop an empty query, fragment or
// user info, resolve dot segments and strip spaces.
const ORIGIN_SHAPE = /^https?:\/\/[^/\\?#@\s]+\/?$/i;

// A name or IPv4 address, or a bracketed IPv6 address, with an optional port.
const HOST_SHAPE =
	/^(\[[0-9a-fA-F:.]+\]|[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*\.?)(?::(\d{1,5}))?$/;

export function parsePublicUrl(raw: string | undefined): string | undefined {
	if (raw === undefined || raw === "") return undefined;
	if (!ORIGIN_SHAPE.test(raw) || !URL.canParse(raw)) {
		throw new Error(INVALID_PUBLIC_URL);
	}
	return new URL(raw).origin;
}

function isValidHost(host: string): boolean {
	const match = HOST_SHAPE.exec(host);
	// URL rejects bad IP addresses and ports above 65535, but accepts port 0.
	if (match === null || !URL.canParse(`http://${host}`)) return false;
	return match[2] === undefined || Number(match[2]) > 0;
}

/** The origin clients reach this server at, or null when the request does not give a valid one. */
export function resolvePublicUrl(
	request: Pick<FastifyRequest, "protocol" | "headers">,
	override?: string,
): string | null {
	if (override !== undefined) return override;
	const { protocol } = request;
	const { host } = request.headers;
	if (protocol !== "http" && protocol !== "https") return null;
	if (host === undefined || !isValidHost(host)) return null;
	return `${protocol}://${host}`;
}

export function makePairingLink(origin: string, token: string): string {
	return `${origin}/pair#token=${token}`;
}
