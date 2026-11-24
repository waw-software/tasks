import Fastify from "fastify";
import { app } from "./app.js";

const server = Fastify({ logger: true });
await server.register(app);
await server.listen({
	host: process.env.HOST ?? "127.0.0.1",
	port: Number(process.env.PORT ?? 3000),
});
