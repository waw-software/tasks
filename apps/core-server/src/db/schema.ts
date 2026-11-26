import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
