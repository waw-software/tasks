import { describe, expect, it, vi } from "vitest";
import type { Queue } from "../src/worker.js";
import { createWorker } from "../src/worker.js";

type Failing = Partial<Record<"start" | "createQueue" | "work", Error>>;

function fakeQueue(failing: Failing = {}) {
	const calls: string[] = [];
	const queue = {
		start: async () => {
			calls.push("start");
			if (failing.start) throw failing.start;
		},
		stop: async () => {
			calls.push("stop");
		},
		createQueue: async (name: string) => {
			calls.push(`createQueue:${name}`);
			if (failing.createQueue) throw failing.createQueue;
		},
		work: async (name: string) => {
			calls.push(`work:${name}`);
			if (failing.work) throw failing.work;
			return "worker-id";
		},
	} as unknown as Queue;
	return { calls, queue };
}

function fakeLog(calls: string[]) {
	return {
		info: vi.fn((message: string) => {
			calls.push(`info:${message}`);
		}),
		error: vi.fn(),
	};
}

const handler = async () => undefined;

describe("core-worker lifecycle", () => {
	it("REQ-001 AC-02: reports ready after the queue starts and every handler is registered", async () => {
		const { calls, queue } = fakeQueue();
		const log = fakeLog(calls);
		const worker = createWorker({
			queue,
			handlers: { "test-job": handler },
			log,
		});

		await worker.start();

		expect(calls).toEqual([
			"start",
			"createQueue:test-job",
			"work:test-job",
			"info:worker ready",
		]);
		expect(worker.isReady()).toBe(true);
	});

	it("REQ-001 AC-02: reports the failure and is not ready when the queue fails to start", async () => {
		const { calls, queue } = fakeQueue({
			start: new Error("connection refused"),
		});
		const log = fakeLog(calls);
		const worker = createWorker({
			queue,
			handlers: { "test-job": handler },
			log,
		});

		await expect(worker.start()).rejects.toThrow("connection refused");

		expect(worker.isReady()).toBe(false);
		expect(calls).toEqual(["start"]);
		expect(log.error).toHaveBeenCalledWith(
			"worker failed to start: connection refused",
		);
	});

	it("REQ-001 AC-02: is not ready when a handler fails to register", async () => {
		const { calls, queue } = fakeQueue({ work: new Error("register failed") });
		const log = fakeLog(calls);
		const worker = createWorker({
			queue,
			handlers: { "test-job": handler },
			log,
		});

		await expect(worker.start()).rejects.toThrow("register failed");

		expect(worker.isReady()).toBe(false);
		expect(log.error).toHaveBeenCalledWith(
			"worker failed to start: register failed",
		);
	});

	it("REQ-001 AC-02: is not ready after stop", async () => {
		const { calls, queue } = fakeQueue();
		const worker = createWorker({
			queue,
			handlers: { "test-job": handler },
			log: fakeLog(calls),
		});

		await worker.start();
		await worker.stop();

		expect(worker.isReady()).toBe(false);
		expect(calls.at(-1)).toBe("stop");
	});
});
