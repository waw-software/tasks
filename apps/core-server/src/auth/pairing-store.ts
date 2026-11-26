import { randomBytes } from "node:crypto";
import type { DeviceCredential } from "@waw/api-contract";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { pairingTokens } from "../db/schema.ts";
import {
	type AppDb,
	hashDeviceToken,
	issueDeviceToken,
} from "./device-store.ts";

export const PAIRING_TTL_MS = 60 * 60 * 1000;

// Drizzle puts the query parameters, the digest among them, into its error message.
// Only the driver's error code is kept, so nothing sensitive reaches a log or a response.
function hideQuery(error: unknown): never {
	const code = (error as { cause?: { code?: unknown } }).cause?.code;
	const suffix = typeof code === "string" ? ` (${code})` : "";
	throw new Error(`pairing token query failed${suffix}`);
}

export async function issuePairingToken(
	db: Pick<AppDb, "insert">,
	now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
	const token = `waw_pair_${randomBytes(32).toString("base64url")}`;
	const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS);
	await db
		.insert(pairingTokens)
		.values({ tokenHash: hashDeviceToken(token), expiresAt })
		.catch(hideQuery);
	return { token, expiresAt };
}

/**
 * Consumes the pairing token and issues a device token in one transaction. The update
 * locks the row, so only one of several concurrent redemptions finds it unconsumed.
 * Returns null for an unknown, expired or consumed token.
 */
export function redeemPairingToken(
	db: AppDb,
	token: string,
): Promise<DeviceCredential | null> {
	return db.transaction(async (tx) => {
		const consumed = await tx
			.update(pairingTokens)
			.set({ consumedAt: sql`now()` })
			.where(
				and(
					eq(pairingTokens.tokenHash, hashDeviceToken(token)),
					isNull(pairingTokens.consumedAt),
					gt(pairingTokens.expiresAt, sql`now()`),
				),
			)
			.returning({ tokenHash: pairingTokens.tokenHash })
			.catch(hideQuery);
		return consumed.length > 0 ? issueDeviceToken(tx) : null;
	});
}
