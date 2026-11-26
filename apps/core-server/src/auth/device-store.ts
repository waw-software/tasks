import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DeviceCredential, DeviceIdentity } from "@waw/api-contract";
import { and, eq, isNull, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "../db/schema.ts";

const { deviceTokens } = schema;

export type AppDb = NodePgDatabase<typeof schema>;

export function createDb(pool: Pool): AppDb {
	return drizzle(pool, { schema });
}

export function hashDeviceToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

// Drizzle puts the query parameters, the digest among them, into its error message.
// Only the driver's error code is kept, so nothing sensitive reaches a log or a response.
function hideQuery(error: unknown): never {
	const code = (error as { cause?: { code?: unknown } }).cause?.code;
	const suffix = typeof code === "string" ? ` (${code})` : "";
	throw new Error(`device token query failed${suffix}`);
}

async function issueToken(
	db: Pick<AppDb, "insert">,
	prefix: "waw_dev_" | "waw_ses_",
): Promise<{ id: string; token: string }> {
	const id = randomUUID();
	const token = `${prefix}${randomBytes(32).toString("base64url")}`;
	await db
		.insert(deviceTokens)
		.values({ id, tokenHash: hashDeviceToken(token) })
		.catch(hideQuery);
	return { id, token };
}

export function issueDeviceToken(
	db: Pick<AppDb, "insert">,
): Promise<DeviceCredential> {
	return issueToken(db, "waw_dev_");
}

/**
 * The token of a browser session. It is a device like any other, but its prefix keeps
 * Bearer routes from accepting it: a cookie also reaches other ports of its host.
 */
export function issueSessionToken(
	db: Pick<AppDb, "insert">,
): Promise<{ id: string; token: string }> {
	return issueToken(db, "waw_ses_");
}

export async function findDeviceToken(
	db: AppDb,
	token: string,
): Promise<DeviceIdentity | null> {
	const [device] = await db
		.select({ id: deviceTokens.id })
		.from(deviceTokens)
		.where(
			and(
				eq(deviceTokens.tokenHash, hashDeviceToken(token)),
				isNull(deviceTokens.revokedAt),
			),
		)
		.limit(1)
		.catch(hideQuery);
	return device ?? null;
}

export async function revokeDeviceToken(db: AppDb, id: string): Promise<void> {
	await db
		.update(deviceTokens)
		.set({ revokedAt: sql`now()` })
		.where(and(eq(deviceTokens.id, id), isNull(deviceTokens.revokedAt)))
		.catch(hideQuery);
}
