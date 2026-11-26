import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { API_VERSION, HealthResponseSchema } from "@waw/api-contract";
import type { FastifyPluginAsync } from "fastify";
import type { AppOptions } from "../app.ts";
import { CAPABILITIES } from "../capabilities.ts";

const health: FastifyPluginAsync<Pick<AppOptions, "capabilities">> = async (
	fastify,
	opts,
): Promise<void> => {
	const capabilities = [...(opts.capabilities ?? CAPABILITIES)];

	fastify
		.withTypeProvider<TypeBoxTypeProvider>()
		.get(
			"/health",
			{ schema: { response: { 200: HealthResponseSchema } } },
			async (_request, reply) => {
				reply.header("cache-control", "no-store");
				return { apiVersion: API_VERSION, capabilities };
			},
		);
};

export default health;
