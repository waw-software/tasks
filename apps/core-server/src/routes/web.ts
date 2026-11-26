import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";
import type { AppOptions } from "../app.ts";

const web: FastifyPluginAsync<AppOptions> = async (
	fastify,
	{ webRoot },
): Promise<void> => {
	if (!webRoot) return;

	// Only these two subtrees are public: there is no SPA fallback and no listing.
	await fastify.register(fastifyStatic, {
		root: join(webRoot, "assets"),
		prefix: "/assets/",
	});
	await fastify.register(fastifyStatic, {
		root: join(webRoot, "fonts"),
		prefix: "/fonts/",
		decorateReply: false,
	});

	// The shell names the hashed assets, so a client revalidates it on every load.
	fastify.get("/", (_request, reply) =>
		reply
			.sendFile("index.html", webRoot, { cacheControl: false })
			.header("cache-control", "no-cache"),
	);
};

export default web;
