import Fastify from "fastify";
import { app } from "./app.js";
import { loggerOptions, notFound } from "./auth/device-auth.js";
import { createDb } from "./auth/device-store.js";
import { readServerConfig, redactDatabaseUrl } from "./db/config.js";
import { migrateDatabase, openDatabase } from "./db/database.js";

async function main(): Promise<void> {
	const server = Fastify({ logger: loggerOptions });
	server.setNotFoundHandler(notFound);

	let config: ReturnType<typeof readServerConfig>;
	try {
		config = readServerConfig(process.env);
	} catch (error) {
		server.log.error({ stage: "config" }, (error as Error).message);
		process.exitCode = 1;
		return;
	}
	const { databaseUrl, host, port } = config;

	// Only the redacted message is logged: the error object may carry connection details.
	const logFailure = (stage: string, error: unknown): void => {
		const message = error instanceof Error ? error.message : String(error);
		server.log.error({ stage }, redactDatabaseUrl(message, databaseUrl));
	};

	const pool = openDatabase(databaseUrl);
	pool.on("error", (error) => logFailure("database", error));

	try {
		await migrateDatabase(pool);
	} catch (error) {
		logFailure("migrate", error);
		await pool.end().catch(() => {});
		process.exitCode = 1;
		return;
	}

	const db = createDb(pool);

	let stopping = false;
	const shutdown = async (): Promise<void> => {
		if (stopping) return;
		stopping = true;
		try {
			await server.close();
			await pool.end();
		} catch (error) {
			logFailure("shutdown", error);
			process.exitCode = 1;
		}
	};

	try {
		await server.register(app, { db });
		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);
		await server.listen({ host, port });
	} catch (error) {
		logFailure("listen", error);
		await pool.end().catch(() => {});
		process.exitCode = 1;
	}
}

await main();
