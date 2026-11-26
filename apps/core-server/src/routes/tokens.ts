import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import {
	DeviceCredentialSchema,
	DeviceIdentitySchema,
	DeviceTokenParamsSchema,
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
	const onRequest = [noStore, requireDevice(db)];

	server.get(
		"/tokens/current",
		{
			onRequest,
			schema: {
				response: { 200: DeviceIdentitySchema, 401: UnauthorizedSchema },
			},
		},
		// requireDevice answers 401 itself, so the identity is set here.
		async (request) => request.device as NonNullable<typeof request.device>,
	);

	server.post(
		"/tokens",
		{
			onRequest,
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
			onRequest,
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
