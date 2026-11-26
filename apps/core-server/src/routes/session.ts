import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
	SessionActiveSchema,
	SessionCreatedSchema,
	SessionForbiddenSchema,
	UnauthorizedSchema,
} from "@waw/api-contract";
import type { FastifyPluginAsync, onRequestAsyncHookHandler } from "fastify";
import type { AppOptions } from "../app.ts";
import { requireDevice } from "../auth/device-auth.ts";
import {
	findDeviceToken,
	issueSessionToken,
	revokeDeviceToken,
} from "../auth/device-store.ts";
import {
	readSessionCookie,
	sessionRequestError,
	writeSessionCookie,
} from "../auth/session-cookie.ts";

const noStore: onRequestAsyncHookHandler = async (_request, reply) => {
	reply.header("cache-control", "no-store");
};

// Both writes need an allowed transport and the server's own Origin, checked before any
// token is looked up.
const sameOrigin: onRequestAsyncHookHandler = async (request, reply) => {
	const error = sessionRequestError(request, true);
	// Returning the reply stops the request here.
	if (error) return reply.code(403).send(error);
};

const session: FastifyPluginAsync<AppOptions> = async (
	fastify,
	{ db },
): Promise<void> => {
	if (!db) return;

	const server = fastify.withTypeProvider<TypeBoxTypeProvider>();
	const guarded = { onRequest: [noStore, sameOrigin], bodyLimit: 1024 };

	server.post(
		"/session",
		{
			...guarded,
			// Authenticates after the body has arrived, as the token writes do.
			preHandler: requireDevice(db, { mode: "bearer" }),
			schema: {
				response: {
					201: SessionCreatedSchema,
					401: UnauthorizedSchema,
					403: SessionForbiddenSchema,
					409: SessionActiveSchema,
				},
			},
		},
		async (request, reply) => {
			const current = readSessionCookie(request.headers.cookie);
			if (current && (await findDeviceToken(db, current))) {
				return reply.code(409).send({ error: "session_active" as const });
			}
			// The browser gets its own device; the token leaves only in the cookie.
			const { id, token } = await issueSessionToken(db);
			reply.header(
				"set-cookie",
				writeSessionCookie(token, request.protocol === "https"),
			);
			return reply.code(201).send({ id });
		},
	);

	server.delete(
		"/session",
		{
			...guarded,
			schema: {
				response: { 204: { type: "null" }, 403: SessionForbiddenSchema },
			},
		},
		async (request, reply) => {
			// Only the cookie names the device to revoke, never the Authorization header.
			const token = readSessionCookie(request.headers.cookie);
			const device = token ? await findDeviceToken(db, token) : null;
			// A failure throws before the cookie is cleared, so sign-out can be retried.
			if (device) await revokeDeviceToken(db, device.id);
			reply.header(
				"set-cookie",
				writeSessionCookie(null, request.protocol === "https"),
			);
			return reply.code(204).send(null);
		},
	);
};

export default session;
