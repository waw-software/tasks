import { SetupCodeSchema } from "@waw/api-contract";
import { describe, expect, it } from "vitest";
import type { AppDb } from "../src/auth/device-store.js";
import { prepareSetup } from "../src/auth/setup.js";

/** A database whose setup_claim read returns `rows` and that must not open a transaction. */
function fakeDb(rows: unknown[]) {
	let transactions = 0;
	const db = {
		select: () => ({ from: () => ({ limit: async () => rows }) }),
		transaction: async () => {
			transactions += 1;
			throw new Error("a transaction was opened");
		},
	} as unknown as AppDb;
	return { db, transactions: () => transactions };
}

describe("setup service", () => {
	it("REQ-011 AC-39: the setup code matches the contract pattern and is passed to logCode once", async () => {
		const codes: string[] = [];

		const setup = await prepareSetup(fakeDb([]).db, (code) => codes.push(code));

		expect(await setup.isClaimed()).toBe(false);
		expect(codes).toHaveLength(1);
		expect(codes[0]).toMatch(/^waw_setup_[A-Za-z0-9_-]{43}$/);
		expect(SetupCodeSchema).toMatchObject({
			pattern: "^waw_setup_[A-Za-z0-9_-]{43}$",
		});
	});

	it("REQ-011 AC-39: a wrong code is invalid without touching the database", async () => {
		const { db, transactions } = fakeDb([]);
		const setup = await prepareSetup(db, () => {});

		for (const code of [`waw_setup_${"A".repeat(43)}`, "malformed", ""]) {
			expect(await setup.claim(code, "http://localhost:3000")).toEqual({
				kind: "invalid",
			});
		}
		expect(transactions()).toBe(0);
	});

	it("REQ-011 AC-39: a claimed server prepares no code", async () => {
		const codes: string[] = [];
		const { db, transactions } = fakeDb([{ id: 1 }]);

		const setup = await prepareSetup(db, (code) => codes.push(code));

		expect(codes).toEqual([]);
		expect(await setup.isClaimed()).toBe(true);
		expect(
			await setup.claim(`waw_setup_${"A".repeat(43)}`, "http://localhost:3000"),
		).toEqual({ kind: "closed" });
		expect(transactions()).toBe(0);
	});
});
