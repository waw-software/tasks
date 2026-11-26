import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
	DeviceCredentialSchema,
	DeviceIdentitySchema,
	DeviceTokenParamsSchema,
	SessionForbiddenSchema,
	UnauthorizedSchema,
} from "@waw/api-contract";
import type { FastifyPluginAsync, onRequestAsyncHookHandler } from "fastify";
import type { AppOptions } from "../app.ts";
import { requireDevice } from "../auth/device-auth.ts";
import { issueDeviceToken, revokeDeviceToken } from "../auth/device-store.ts";

const noStore: onRequestAsyncHookHandler = async (_request, reply) => {
	reply.header("cache-control", "no-store");
};

const tokens: FastifyPluginAsync<AppOptions> = async (
	fastify,
	{ db },
): Promise<void> => {
	if (!db) return;

	const server = fastify.withTypeProvider<TypeBoxTypeProvider>();
	const authenticate = requireDevice(db);
	// A write authenticates after its body has arrived, so a slow request cannot
	// outlive the revocation of its token.
	const write = {
		onRequest: noStore,
		preHandler: authenticate,
		bodyLimit: 1024,
	};

	server.get(
		"/tokens/current",
		{
			// The one token route that also accepts the browser session cookie.
			onRequest: [
				noStore,
				requireDevice(db, { mode: "either", refreshCookie: true }),
			],
			schema: {
				response: {
					200: DeviceIdentitySchema,
					401: UnauthorizedSchema,
					403: SessionForbiddenSchema,
				},
			},
		},
		// requireDevice answers 401 itself, so the identity is set here.
		async (request) => request.device as NonNullable<typeof request.device>,
	);

	server.post(
		"/tokens",
		{
			...write,
			schema: {
				response: { 201: DeviceCredentialSchema, 401: UnauthorizedSchema },
			},
		},
		async (_request, reply) => {
			reply.code(201);
			return issueDeviceToken(db);
		},
	);

	server.delete(
		"/tokens/:id",
		{
			...write,
			schema: {
				params: DeviceTokenParamsSchema,
				response: { 204: { type: "null" }, 401: UnauthorizedSchema },
			},
		},
		async (request, reply) => {
			await revokeDeviceToken(db, request.params.id);
			return reply.code(204).send(null);
		},
	);
};

export default tokens;
