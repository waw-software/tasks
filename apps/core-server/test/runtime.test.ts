import { describe, expect, it } from "vitest";
import { createRuntime, type RuntimeSteps } from "../src/runtime.js";

type Step = keyof RuntimeSteps;

/** Steps that record their order; a step with an error in `failures` rejects with it. */
function fakeSteps(failures: Partial<Record<Step, Error>> = {}) {
	const calls: Step[] = [];
	const step = (name: Step) => async (): Promise<void> => {
		calls.push(name);
		const failure = failures[name];
		if (failure) throw failure;
	};
	const steps: RuntimeSteps = {
		migrate: step("migrate"),
		startWorker: step("startWorker"),
		listen: step("listen"),
		closeHttp: step("closeHttp"),
		stopWorker: step("stopWorker"),
		closeDatabase: step("closeDatabase"),
	};
	return { calls, steps };
}

/** A promise the test resolves by hand. */
function deferred() {
	let resolve = (): void => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

/** Lets every pending promise callback run. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("createRuntime", () => {
	it("REQ-001 AC-01 starts migrations, then the worker, then HTTP", async () => {
		const { calls, steps } = fakeSteps();
		const migration = deferred();
		const worker = deferred();
		const runtime = createRuntime({
			...steps,
			migrate: async () => {
				await steps.migrate();
				await migration.promise;
			},
			startWorker: async () => {
				await steps.startWorker();
				await worker.promise;
			},
		});

		const started = runtime.start();
		await flush();
		expect(calls).toEqual(["migrate"]);

		migration.resolve();
		await flush();
		expect(calls).toEqual(["migrate", "startWorker"]);

		worker.resolve();
		await started;
		expect(calls).toEqual(["migrate", "startWorker", "listen"]);
	});

	it("does not listen and closes the database when the worker fails to start", async () => {
		const failure = new Error("worker failed");
		const { calls, steps } = fakeSteps({ startWorker: failure });

		await expect(createRuntime(steps).start()).rejects.toBe(failure);

		// A worker that failed half-way may hold connections, so it is stopped too.
		expect(calls).toEqual([
			"migrate",
			"startWorker",
			"stopWorker",
			"closeDatabase",
		]);
	});

	it("does not start the worker or listen when migrations fail, and closes the database", async () => {
		const failure = new Error("migration failed");
		const { calls, steps } = fakeSteps({ migrate: failure });

		await expect(createRuntime(steps).start()).rejects.toBe(failure);

		expect(calls).toEqual(["migrate", "closeDatabase"]);
	});

	it("stops the worker, then the database, when HTTP fails to listen, and rethrows that failure", async () => {
		const failure = new Error("address in use");
		const { calls, steps } = fakeSteps({
			listen: failure,
			stopWorker: new Error("stop failed"),
		});
		const runtime = createRuntime(steps);

		await expect(runtime.start()).rejects.toBe(failure);
		await runtime.stop();

		// The later stop() closes nothing a second time.
		expect(calls).toEqual([
			"migrate",
			"startWorker",
			"listen",
			"stopWorker",
			"closeDatabase",
		]);
	});

	it("stops HTTP, then the worker, then the database, once, even when a step fails", async () => {
		const first = new Error("http close failed");
		const { calls, steps } = fakeSteps({
			closeHttp: first,
			stopWorker: new Error("worker stop failed"),
		});
		const runtime = createRuntime(steps);
		await runtime.start();
		calls.length = 0;

		const stopping = runtime.stop();
		expect(runtime.stop()).toBe(stopping);
		await expect(stopping).rejects.toBe(first);

		expect(calls).toEqual(["closeHttp", "stopWorker", "closeDatabase"]);
	});

	it("waits for a start in progress before it stops", async () => {
		const { calls, steps } = fakeSteps();
		const listening = deferred();
		const runtime = createRuntime({
			...steps,
			listen: async () => {
				await steps.listen();
				await listening.promise;
			},
		});

		const started = runtime.start();
		await flush();
		const stopped = runtime.stop();
		await flush();
		expect(calls).toEqual(["migrate", "startWorker", "listen"]);

		listening.resolve();
		await Promise.all([started, stopped]);
		expect(calls.slice(3)).toEqual([
			"closeHttp",
			"stopWorker",
			"closeDatabase",
		]);
	});
});
