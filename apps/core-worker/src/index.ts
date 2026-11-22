import { PgBoss } from "pg-boss";
import { createWorker } from "./worker.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("DATABASE_URL is not set");
	process.exitCode = 1;
} else {
	const queue = new PgBoss(databaseUrl);
	queue.on("error", (error) => console.error(error));
	const worker = createWorker({ queue, handlers: {}, log: console });

	const shutdown = () => {
		worker.stop().catch((error: unknown) => {
			console.error(error);
			process.exitCode = 1;
		});
	};
	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	try {
		await worker.start();
	} catch {
		process.exitCode = 1;
	}
}
