import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

/** The advisory lock key migrations run under. packages/e2e/tests/migrations.spec.ts repeats it. */
export const MIGRATION_LOCK_KEY = 72_026_113;

// Two levels up from both src/db/ and dist/db/.
const migrationsFolder = fileURLToPath(
	new URL("../../migrations/", import.meta.url),
);

export function openDatabase(databaseUrl: string): Pool {
	return new Pool({
		connectionString: databaseUrl,
		max: 10,
		connectionTimeoutMillis: 5_000,
	});
}

export async function migrateDatabase(pool: Pool): Promise<void> {
	const client = await pool.connect();
	// Without a listener, a dropped connection crashes the process. The pending query
	// rejects with the error, and that rejection is what propagates.
	const onClientError = (): void => {};
	client.on("error", onClientError);
	// The first failure is the one to report, so a later unlock error does not replace it.
	let failure: { error: unknown } | undefined;
	let unlocked = false;
	try {
		await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
		await migrate(drizzle(client), { migrationsFolder });
	} catch (error) {
		failure = { error };
	}
	try {
		await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
		unlocked = true;
	} catch (error) {
		failure ??= { error };
	}
	// A connection that may still hold the lock is destroyed, not pooled.
	client.release(!unlocked);
	client.off("error", onClientError);
	if (failure) {
		throw failure.error;
	}
}
