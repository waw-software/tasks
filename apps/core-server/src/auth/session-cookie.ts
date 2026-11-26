import {
	DEVICE_TOKEN_PATTERN,
	SESSION_COOKIE,
	type SessionForbidden,
} from "@waw/api-contract";
import type { FastifyRequest } from "fastify";
import { isLoopbackHost, resolvePublicUrl } from "../public-url.ts";

const DEVICE_TOKEN = new RegExp(DEVICE_TOKEN_PATTERN);
// 400 days, the longest lifetime browsers keep.
const MAX_AGE_SECONDS = 34_560_000;

/** The values of every session cookie pair in a Cookie header. */
function sessionValues(header: string | undefined): string[] {
	const prefix = `${SESSION_COOKIE}=`;
	return (header ?? "")
		.split(";")
		.map((pair) => pair.trim())
		.filter((pair) => pair.startsWith(prefix))
		.map((pair) => pair.slice(prefix.length));
}

/** Whether the request offers a session cookie at all, usable or not. */
export function hasSessionCookie(header: string | undefined): boolean {
	return sessionValues(header).length > 0;
}

/** The token of the one well-formed session cookie, or null. */
export function readSessionCookie(header: string | undefined): string | null {
	const [value, ...others] = sessionValues(header);
	if (value === undefined || others.length > 0) return null;
	return DEVICE_TOKEN.test(value) ? value : null;
}

/** The Set-Cookie value that stores the token, or clears the cookie for null. */
export function writeSessionCookie(
	token: string | null,
	secure: boolean,
): string {
	const maxAge = token === null ? 0 : MAX_AGE_SECONDS;
	const cookie = `${SESSION_COOKIE}=${token ?? ""}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Strict`;
	return secure ? `${cookie}; Secure` : cookie;
}

/** Why a request may not use the browser session, or null when it may. */
export function sessionRequestError(
	request: Pick<FastifyRequest, "protocol" | "headers">,
	checkOrigin: boolean,
): SessionForbidden | null {
	// The protocol is https only on the word of a trusted proxy.
	if (request.protocol !== "https" && !isLoopbackHost(request.headers.host)) {
		return { error: "https_required" };
	}
	if (!checkOrigin) return null;
	// No PUBLIC_URL override: the Origin must name the address this request used.
	const own = resolvePublicUrl(request);
	if (own === null || request.headers.origin !== new URL(own).origin) {
		return { error: "csrf_forbidden" };
	}
	return null;
}
