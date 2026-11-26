import { describe, expect, it, vi } from "vitest";
import { createPgBossWorker } from "../src/runtime.js";

describe("pg-boss worker factory", () => {
	it("createPgBossWorker returns a worker that is not ready and connects nothing before start", () => {
		const log = { info: vi.fn(), error: vi.fn() };

		const worker = createPgBossWorker("postgres://u:p@127.0.0.1:1/x", log);

		expect(worker.isReady()).toBe(false);
		expect(log.info).not.toHaveBeenCalled();
		expect(log.error).not.toHaveBeenCalled();
	});
});
