import { readServerConfig, redactDatabaseUrl } from "../db/config.ts";
import { openDatabase } from "../db/database.ts";
import {
	type AppDb,
	createDb,
	issueDeviceToken,
	revokeDeviceToken,
} from "./device-store.ts";

const USAGE = "Usage: token-cli.js issue | token-cli.js revoke <uuid>";

// The contract's DeviceTokenIdSchema is a string of format "uuid".
const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

type Command = (db: AppDb) => Promise<void>;

const issue: Command = async (db) => {
	const credential = await issueDeviceToken(db);
	process.stdout.write(`${JSON.stringify(credential)}\n`);
};

function parseCommand(args: string[]): Command | undefined {
	const [name, id, ...rest] = args;
	if (name === "issue" && id === undefined) {
		return issue;
	}
	if (name === "revoke" && id && UUID.test(id) && rest.length === 0) {
		return (db) => revokeDeviceToken(db, id);
	}
	return undefined;
}

// A failed query's message repeats its parameters; the cause says what went wrong.
function describeFailure(error: unknown): string {
	const reason =
		error instanceof Error && error.cause instanceof Error
			? error.cause
			: error;
	const message = reason instanceof Error ? reason.message : String(reason);
	return message.replace(/\s*\n\s*/g, " ");
}

// The migrations are the running server's job: the CLI only uses the schema.
async function runCommand(
	command: Command,
	databaseUrl: string,
): Promise<void> {
	const pool = openDatabase(databaseUrl);
	try {
		await command(createDb(pool));
	} finally {
		await pool.end();
	}
}

async function main(args: string[]): Promise<void> {
	const command = parseCommand(args);
	if (!command) {
		process.stderr.write(`${USAGE}\n`);
		process.exitCode = 2;
		return;
	}

	let databaseUrl: string | undefined;
	try {
		databaseUrl = readServerConfig(process.env).databaseUrl;
		await runCommand(command, databaseUrl);
	} catch (error) {
		// Without a URL the failure is the config's, whose message never contains it.
		const message = describeFailure(error);
		process.stderr.write(
			`${databaseUrl ? redactDatabaseUrl(message, databaseUrl) : message}\n`,
		);
		process.exitCode = 1;
	}
}

await main(process.argv.slice(2));
