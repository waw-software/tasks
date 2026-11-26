import { createPgBossWorker } from "./runtime.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("DATABASE_URL is not set");
	process.exitCode = 1;
} else {
	const worker = createPgBossWorker(databaseUrl, console);

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
