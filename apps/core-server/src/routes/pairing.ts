import {
	type Static,
	Type,
	type TypeBoxTypeProvider,
} from "@fastify/type-provider-typebox";
import {
	type BadPublicAddressSchema,
	DeviceCredentialSchema,
	PairingLinkSchema,
	PairingRedeemBodySchema,
	UnauthorizedSchema,
} from "@waw/api-contract";
import type { FastifyPluginAsync, onRequestAsyncHookHandler } from "fastify";
import type { AppOptions } from "../app.ts";
import { requireDevice } from "../auth/device-auth.ts";
import {
	issuePairingToken,
	redeemPairingToken,
} from "../auth/pairing-store.ts";
import { makePairingLink, resolvePublicUrl } from "../public-url.ts";

const noStore: onRequestAsyncHookHandler = async (_request, reply) => {
	reply.header("cache-control", "no-store");
};

// The serializer writes a literal over whatever it is given, and Fastify's own 400 (a
// malformed body) goes through the same schema. So this one accepts both shapes.
const BadRequestSchema = Type.Object({
	error: Type.String(),
	statusCode: Type.Optional(Type.Integer()),
	code: Type.Optional(Type.String()),
	message: Type.Optional(Type.String()),
});

const pairing: FastifyPluginAsync<AppOptions> = async (
	fastify,
	{ db, publicUrl },
): Promise<void> => {
	if (!db) return;

	const server = fastify.withTypeProvider<TypeBoxTypeProvider>();
	const limited = { onRequest: noStore, bodyLimit: 1024 };

	server.post(
		"/tokens/pairing",
		{
			...limited,
			// Authenticates after the body has arrived, like the other writes.
			preHandler: requireDevice(db),
			schema: {
				response: {
					201: PairingLinkSchema,
					400: BadRequestSchema,
					401: UnauthorizedSchema,
				},
			},
		},
		async (request, reply) => {
			const origin = resolvePublicUrl(request, publicUrl);
			if (origin === null) {
				const body: Static<typeof BadPublicAddressSchema> = {
					error: "invalid_public_address",
				};
				return reply.code(400).send(body);
			}
			const { token, expiresAt } = await issuePairingToken(db);
			return reply.code(201).send({
				pairingLink: makePairingLink(origin, token),
				expiresAt: expiresAt.toISOString(),
			});
		},
	);

	// Public: the pairing token in the body is the credential. It is not Bearer
	// authentication, so a 401 carries no challenge.
	server.post(
		"/tokens/pairing/redeem",
		{
			...limited,
			schema: {
				body: PairingRedeemBodySchema,
				response: { 201: DeviceCredentialSchema, 401: UnauthorizedSchema },
			},
		},
		async (request, reply) => {
			const credential = await redeemPairingToken(db, request.body.token);
			if (credential === null) {
				return reply.code(401).send({ error: "unauthorized" });
			}
			return reply.code(201).send(credential);
		},
	);
};

export default pairing;
