import { PgBoss } from "pg-boss";
import { createWorker, type Worker } from "./worker.js";

export type { Worker } from "./worker.js";

/** Builds the pg-boss queue and the worker; connects nothing until start(). Queue errors go to log.error as a message string. */
export function createPgBossWorker(
	databaseUrl: string,
	log: Pick<Console, "info" | "error">,
): Worker {
	const queue = new PgBoss(databaseUrl);
	queue.on("error", (error) => log.error(error.message));
	return createWorker({ queue, handlers: {}, log });
}
