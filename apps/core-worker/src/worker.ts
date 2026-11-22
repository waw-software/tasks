import type { PgBoss, WorkHandler } from "pg-boss";

export type Queue = Pick<PgBoss, "start" | "stop" | "createQueue" | "work">;
export type Handlers = Readonly<Record<string, WorkHandler<unknown>>>;

export interface Worker {
	start(): Promise<void>;
	stop(): Promise<void>;
	isReady(): boolean;
}

export function createWorker(deps: {
	queue: Queue;
	handlers: Handlers;
	log: Pick<Console, "info" | "error">;
}): Worker {
	const { queue, handlers, log } = deps;
	let ready = false;

	return {
		async start() {
			try {
				await queue.start();
				for (const [name, handler] of Object.entries(handlers)) {
					await queue.createQueue(name);
					await queue.work(name, handler);
				}
				ready = true;
				log.info("worker ready");
			} catch (error) {
				ready = false;
				const message = error instanceof Error ? error.message : String(error);
				log.error(`worker failed to start: ${message}`);
				throw error;
			}
		},
		async stop() {
			ready = false;
			await queue.stop();
		},
		isReady() {
			return ready;
		},
	};
}
