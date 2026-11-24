import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { API_VERSION, HealthResponseSchema } from "@waw/api-contract";
import type { FastifyPluginAsync } from "fastify";
import { CAPABILITIES } from "../capabilities.ts";

const health: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify
		.withTypeProvider<TypeBoxTypeProvider>()
		.get(
			"/health",
			{ schema: { response: { 200: HealthResponseSchema } } },
			async () => ({
				apiVersion: API_VERSION,
				capabilities: [...CAPABILITIES],
			}),
		);
};

export default health;
