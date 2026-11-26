import { type DeviceIdentity, DeviceTokenSchema } from "@waw/api-contract";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type AppDb, findDeviceToken } from "./device-store.ts";
import {
	hasSessionCookie,
	readSessionCookie,
	sessionRequestError,
	writeSessionCookie,
} from "./session-cookie.ts";

declare module "fastify" {
	interface FastifyRequest {
		device: DeviceIdentity | null;
	}
}

// The scheme is case-insensitive; the token is not.
const BEARER = /^bearer +(\S+)$/i;
// TString does not type its options, so the pattern is read through a narrower type.
const DEVICE_TOKEN = new RegExp(
	(DeviceTokenSchema as unknown as { pattern: string }).pattern,
);

// A token can be pasted into a path or a query, so a request is logged by its route
// template, without the URL or the headers.
export const loggerOptions = {
	redact: [
		"req.headers.authorization",
		"req.headers.cookie",
		'res.headers["set-cookie"]',
	],
	serializers: {
		req: (request: FastifyRequest) => ({
			method: request.method,
			route: request.routeOptions?.url ?? "(no route)",
			remoteAddress: request.ip,
		}),
	},
};

// Replaces Fastify's default 404 handler, which writes the raw URL into the log.
export async function notFound(_request: FastifyRequest, reply: FastifyReply) {
	return reply
		.code(404)
		.send({ statusCode: 404, error: "Not Found", message: "Route not found" });
}

async function unauthorized(reply: FastifyReply): Promise<void> {
	await reply
		.code(401)
		.header("www-authenticate", "Bearer")
		.send({ error: "unauthorized" });
}

/**
 * Authenticates by the Bearer token. With mode "either", a request without an
 * Authorization header may use the session cookie instead.
 */
export function requireDevice(
	db: AppDb,
	options: { mode?: "bearer" | "either"; refreshCookie?: boolean } = {},
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
	const { mode = "bearer", refreshCookie = false } = options;
	return async (request, reply) => {
		const { authorization, cookie } = request.headers;
		const byCookie =
			mode === "either" &&
			authorization === undefined &&
			hasSessionCookie(cookie);
		if (byCookie) {
			// Refused before the token is looked up.
			const error = sessionRequestError(
				request,
				request.method !== "GET" && request.method !== "HEAD",
			);
			if (error) {
				await reply.code(403).send(error);
				return;
			}
		}
		const token = byCookie
			? readSessionCookie(cookie)
			: BEARER.exec(authorization ?? "")?.[1];
		const device =
			token && DEVICE_TOKEN.test(token)
				? await findDeviceToken(db, token)
				: null;
		const secure = request.protocol === "https";
		if (!device) {
			if (byCookie) {
				reply.header("set-cookie", writeSessionCookie(null, secure));
			}
			// Awaiting the reply stops the request here.
			await unauthorized(reply);
			return;
		}
		if (byCookie && refreshCookie) {
			reply.header("set-cookie", writeSessionCookie(token ?? null, secure));
		}
		request.device = device;
	};
}
