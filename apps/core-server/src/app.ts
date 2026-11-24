import AutoLoad, { type AutoloadPluginOptions } from "@fastify/autoload";
import type { FastifyPluginAsync, FastifyServerOptions } from "fastify";

export interface AppOptions
	extends FastifyServerOptions,
		Partial<AutoloadPluginOptions> {}

export const app: FastifyPluginAsync<AppOptions> = async (
	fastify,
	opts,
): Promise<void> => {
	fastify.register(AutoLoad, {
		dir: `${import.meta.dirname}/plugins`,
		options: opts,
	});

	fastify.register(AutoLoad, {
		dir: `${import.meta.dirname}/routes`,
		options: opts,
	});
};

export default app;
