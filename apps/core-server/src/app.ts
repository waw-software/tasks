import AutoLoad, { type AutoloadPluginOptions } from "@fastify/autoload";
import type { FastifyPluginAsync, FastifyServerOptions } from "fastify";
import type { AppDb } from "./auth/device-store.ts";

export interface AppOptions
	extends FastifyServerOptions,
		Partial<AutoloadPluginOptions> {
	db?: AppDb;
	/** The built web client; without it the web routes are not registered. */
	webRoot?: string;
	/** Overrides the origin of pairing links; otherwise it comes from the request. */
	publicUrl?: string | undefined;
}

export const app: FastifyPluginAsync<AppOptions> = async (
	fastify,
	opts,
): Promise<void> => {
	// Declared before autoload, so every plugin and route can use requireDevice.
	fastify.decorateRequest("device", null);

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
