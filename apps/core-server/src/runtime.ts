export interface RuntimeSteps {
	migrate(): Promise<void>;
	startWorker(): Promise<void>;
	listen(): Promise<void>;
	closeHttp(): Promise<void>;
	stopWorker(): Promise<void>;
	closeDatabase(): Promise<void>;
}

export interface Runtime {
	start(): Promise<void>;
	stop(): Promise<void>;
}

/** Runs every step even when an earlier one fails, and returns the failures in order. */
async function attemptAll(steps: (() => Promise<void>)[]): Promise<unknown[]> {
	const failures: unknown[] = [];
	for (const step of steps) {
		try {
			await step();
		} catch (error) {
			failures.push(error);
		}
	}
	return failures;
}

/**
 * start: migrate → startWorker → listen; on a failure it undoes what started (worker, then
 * database) and rethrows.
 * stop: one shared promise; waits for a start in progress, then closeHttp → stopWorker →
 * closeDatabase, each attempted even if an earlier one failed; rethrows the first failure.
 * After a failed start there is nothing left to stop.
 */
export function createRuntime(steps: RuntimeSteps): Runtime {
	let starting: Promise<void> | undefined;
	let stopping: Promise<void> | undefined;

	const startAll = async (): Promise<void> => {
		// A worker that failed half-way may hold connections, so it is stopped too.
		let workerTouched = false;
		try {
			await steps.migrate();
			workerTouched = true;
			await steps.startWorker();
			await steps.listen();
		} catch (error) {
			// The start failure is the one to report, so cleanup failures do not replace it.
			await attemptAll(
				workerTouched
					? [steps.stopWorker, steps.closeDatabase]
					: [steps.closeDatabase],
			);
			throw error;
		}
	};

	const stopAll = async (): Promise<void> => {
		try {
			await starting;
		} catch {
			// start() has rolled back and rejected to its own caller.
			return;
		}
		const failures = await attemptAll([
			steps.closeHttp,
			steps.stopWorker,
			steps.closeDatabase,
		]);
		if (failures.length > 0) throw failures[0];
	};

	return {
		start() {
			starting ??= startAll();
			return starting;
		},
		stop() {
			stopping ??= stopAll();
			return stopping;
		},
	};
}
