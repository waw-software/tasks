import { sql } from "drizzle-orm";
import {
	check,
	pgTable,
	smallint,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const deviceTokens = pgTable("device_tokens", {
	id: uuid("id").primaryKey(),
	tokenHash: text("token_hash").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const pairingTokens = pgTable("pairing_tokens", {
	tokenHash: text("token_hash").primaryKey(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

/** At most one row: its presence means that first-run setup is closed for good. */
export const setupClaim = pgTable(
	"setup_claim",
	{
		id: smallint("id").primaryKey(),
		claimedAt: timestamp("claimed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [check("setup_claim_single_row", sql`${table.id} = 1`)],
);
