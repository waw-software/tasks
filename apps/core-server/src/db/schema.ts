import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const deviceTokens = pgTable("device_tokens", {
	id: uuid("id").primaryKey(),
	tokenHash: text("token_hash").notNull().unique(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
});
