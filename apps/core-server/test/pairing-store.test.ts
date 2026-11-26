import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { type AppDb, hashDeviceToken } from "../src/auth/device-store.js";
import {
	issuePairingToken,
	PAIRING_TTL_MS,
	redeemPairingToken,
} from "../src/auth/pairing-store.js";

const pairingToken = `waw_pair_${"A".repeat(43)}`;

function insertInto(rows: unknown[]) {
	return () => ({
		values: async (row: unknown) => {
			rows.push(row);
		},
	});
}

/** A database whose one transaction consumes `consumed` rows. */
function fakeDb(consumed: () => Promise<unknown[]>) {
	const rows: unknown[] = [];
	const query = {
		set: () => query,
		where: () => query,
		returning: consumed,
	};
	const tx = { update: () => query, insert: insertInto(rows) };
	const db = {
		transaction: async (run: (inner: typeof tx) => unknown) => run(tx),
	} as unknown as AppDb;
	return { db, rows };
}

describe("pairing store", () => {
	it("REQ-011 AC-39: issues a token for one hour and stores only its SHA-256 digest", async () => {
		const rows: unknown[] = [];
		const db = { insert: insertInto(rows) } as unknown as AppDb;
		const now = new Date("2026-01-02T03:04:05.000Z");

		const issued = await issuePairingToken(db, now);

		expect(PAIRING_TTL_MS).toBe(3_600_000);
		expect(issued.token).toMatch(/^waw_pair_[A-Za-z0-9_-]{43}$/);
		expect(issued.expiresAt.toISOString()).toBe("2026-01-02T04:04:05.000Z");
		expect(rows).toEqual([
			{
				tokenHash: hashDeviceToken(issued.token),
				expiresAt: issued.expiresAt,
			},
		]);
	});

	it("REQ-011 AC-39: a token that consumes no row gets no device token", async () => {
		const { db, rows } = fakeDb(async () => []);

		expect(await redeemPairingToken(db, pairingToken)).toBeNull();
		expect(rows).toEqual([]);
	});

	it("REQ-011 AC-39: a consumed row yields a new device token in the same transaction", async () => {
		const { db, rows } = fakeDb(async () => [{ tokenHash: "digest" }]);

		const credential = await redeemPairingToken(db, pairingToken);

		expect(credential?.token).toMatch(/^waw_dev_[A-Za-z0-9_-]{43}$/);
		expect(rows).toEqual([
			{
				id: credential?.id,
				tokenHash: hashDeviceToken(credential?.token ?? ""),
			},
		]);
	});

	it("a failed query keeps the token and its digest out of the error", async () => {
		const digest = hashDeviceToken(pairingToken);
		const fail = async (): Promise<never> => {
			throw Object.assign(new Error(`Failed query\nparams: ${digest}`), {
				cause: { code: "08006" },
			});
		};
		const issuing = {
			insert: () => ({ values: fail }),
		} as unknown as AppDb;

		await expect(issuePairingToken(issuing)).rejects.toThrow(
			/^pairing token query failed \(08006\)$/,
		);
		await expect(
			redeemPairingToken(fakeDb(fail).db, pairingToken),
		).rejects.toThrow(/^pairing token query failed \(08006\)$/);
	});
});

describe("pairing routes", () => {
	it("a malformed body is not reported as a bad public address", async () => {
		const server = Fastify();
		await server.register(app, { db: {} as AppDb });

		const res = await server.inject({
			method: "POST",
			url: "/tokens/pairing",
			headers: { "content-type": "application/json" },
			payload: "{bad",
		});

		expect(res.statusCode).toBe(400);
		expect(res.json()).toMatchObject({ code: "FST_ERR_CTP_INVALID_JSON_BODY" });
		await server.close();
	});
});
