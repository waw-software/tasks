import { createPgBossWorker } from "@waw/core-worker";
import Fastify from "fastify";
import { app } from "./app.js";
import { loggerOptions, notFound } from "./auth/device-auth.js";
import { createDb } from "./auth/device-store.js";
import { readServerConfig, redactDatabaseUrl } from "./db/config.js";
import { migrateDatabase, openDatabase } from "./db/database.js";
import { createRuntime } from "./runtime.js";
import { resolveWebRoot } from "./web-root.js";

async function main(): Promise<void> {
	const server = Fastify({ logger: loggerOptions });
	server.setNotFoundHandler(notFound);

	let config: ReturnType<typeof readServerConfig>;
	let webRoot: string;
	try {
		config = readServerConfig(process.env);
		webRoot = resolveWebRoot(process.env);
	} catch (error) {
		server.log.error({ stage: "config" }, (error as Error).message);
		process.exitCode = 1;
		return;
	}
	const { databaseUrl, host, port } = config;

	// Only the redacted message is logged: the error object may carry connection details.
	const redact = (message: unknown): string =>
		redactDatabaseUrl(String(message), databaseUrl);
	const logFailure = (stage: string, error: unknown): void => {
		const message = error instanceof Error ? error.message : String(error);
		server.log.error({ stage }, redact(message));
	};

	const pool = openDatabase(databaseUrl);
	pool.on("error", (error) => logFailure("database", error));
	const db = createDb(pool);
	const worker = createPgBossWorker(databaseUrl, {
		info: (message: unknown) => server.log.info(redact(message)),
		error: (message: unknown) => server.log.error(redact(message)),
	});

	const shutdown = async (): Promise<void> => {
		try {
			await runtime.stop();
		} catch (error) {
			logFailure("shutdown", error);
			process.exitCode = 1;
		}
	};

	const runtime = createRuntime({
		migrate: () => migrateDatabase(pool),
		startWorker: () => worker.start(),
		listen: async () => {
			await server.register(app, { db, webRoot });
			await server.listen({ host, port });
		},
		closeHttp: async () => {
			// A client that stops reading keeps its connection busy and would hold the
			// shutdown forever, so open connections are cut after a grace period.
			const cut = setTimeout(() => server.server.closeAllConnections(), 5_000);
			try {
				await server.close();
			} finally {
				clearTimeout(cut);
			}
		},
		stopWorker: () => worker.stop(),
		closeDatabase: () => pool.end(),
	});

	// Installed before start, so a signal during startup also gets the ordered shutdown.
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	try {
		await runtime.start();
	} catch (error) {
		logFailure("startup", error);
		process.exitCode = 1;
	}
}

await main();
