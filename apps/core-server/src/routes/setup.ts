import {
	type Static,
	Type,
	type TypeBoxTypeProvider,
} from "@fastify/type-provider-typebox";
import {
	type BadPublicAddressSchema,
	HttpsRequiredSchema,
	SetupClaimBodySchema,
	SetupClaimResponseSchema,
	SetupClosedSchema,
	UnauthorizedSchema,
} from "@waw/api-contract";
import type { FastifyPluginAsync } from "fastify";
import type { AppOptions } from "../app.ts";
import { resolvePublicUrl } from "../public-url.ts";

// The serializer writes a literal over whatever it is given, and Fastify's own 400 (a
// malformed body) goes through the same schema. So this one accepts both shapes.
const BadRequestSchema = Type.Object({
	error: Type.String(),
	statusCode: Type.Optional(Type.Integer()),
	code: Type.Optional(Type.String()),
	message: Type.Optional(Type.String()),
});

// The Host header of 127.0.0.0/8, localhost or [::1], with an optional port.
const LOOPBACK_HOST = /^(?:localhost|\[::1\]|127(?:\.\d{1,3}){3})(?::\d+)?$/i;

const setupRoutes: FastifyPluginAsync<AppOptions> = async (
	fastify,
	{ setup, publicUrl },
): Promise<void> => {
	if (!setup) return;

	const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

	// Public: the setup code in the body is the credential, so a 401 carries no challenge.
	server.post(
		"/setup/claim",
		{
			onRequest: async (_request, reply) => {
				reply
					.header("cache-control", "no-store")
					.header("referrer-policy", "no-referrer");
			},
			bodyLimit: 1024,
			schema: {
				body: SetupClaimBodySchema,
				response: {
					201: SetupClaimResponseSchema,
					400: BadRequestSchema,
					401: UnauthorizedSchema,
					403: HttpsRequiredSchema,
					409: SetupClosedSchema,
				},
			},
		},
		async (request, reply) => {
			// The answer carries an owner token, so it must not cross a network in clear
			// text. The protocol is https only on the word of a trusted proxy.
			if (
				request.protocol !== "https" &&
				!LOOPBACK_HOST.test(request.headers.host ?? "")
			) {
				return reply.code(403).send({ error: "https_required" });
			}
			const origin = resolvePublicUrl(request, publicUrl);
			if (origin === null) {
				const body: Static<typeof BadPublicAddressSchema> = {
					error: "invalid_public_address",
				};
				return reply.code(400).send(body);
			}
			const result = await setup.claim(request.body.code, origin);
			switch (result.kind) {
				case "claimed":
					return reply.code(201).send(result.data);
				case "invalid":
					return reply.code(401).send({ error: "unauthorized" });
				case "closed":
					return reply.code(409).send({ error: "setup_closed" });
			}
		},
	);
};

export default setupRoutes;
