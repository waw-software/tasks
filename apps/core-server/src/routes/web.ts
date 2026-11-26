import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";
import type { AppOptions } from "../app.ts";

const web: FastifyPluginAsync<AppOptions> = async (
	fastify,
	{ webRoot, setup },
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

	// Without first-run setup the server counts as claimed.
	const isClaimed = async (): Promise<boolean> =>
		(await setup?.isClaimed()) ?? true;

	// The shell names the hashed assets, so a client revalidates it on every load. The
	// redirects depend on the claim state, so they are never stored.
	fastify.get("/", async (_request, reply) => {
		if (!(await isClaimed())) {
			return reply.header("cache-control", "no-store").redirect("/setup");
		}
		return reply
			.sendFile("index.html", webRoot, { cacheControl: false })
			.header("cache-control", "no-cache");
	});

	fastify.get("/setup", async (_request, reply) => {
		reply
			.header("cache-control", "no-store")
			.header("referrer-policy", "no-referrer");
		if (await isClaimed()) return reply.redirect("/");
		return reply.sendFile("index.html", webRoot, { cacheControl: false });
	});
};

export default web;
