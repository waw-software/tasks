import { type ServerProcess, spawnServer, withDatabase } from "./server.ts";

const CODE_MESSAGE = '"msg":"First-run setup code"';

/** Whether an output line is the server's setup code log line. */
export function isSetupCodeLine(line: string): boolean {
	return line.includes(CODE_MESSAGE);
}

/** Reads the setup code from a server's output (the JSON log line); throws if there is none or more than one. */
export function setupCodeFrom(output: string): string {
	const lines = output.split("\n").filter(isSetupCodeLine);
	const [line] = lines;
	// The errors never quote the output: it may hold a live code.
	if (line === undefined || lines.length > 1) {
		throw new Error(
			`Expected one setup code line in the server output, found ${lines.length}`,
		);
	}
	const { setupCode } = JSON.parse(line) as { setupCode?: unknown };
	if (
		typeof setupCode !== "string" ||
		!/^waw_setup_[A-Za-z0-9_-]{43}$/.test(setupCode)
	) {
		throw new Error("The setup code line has no well-formed setupCode");
	}
	return setupCode;
}

/** Fresh DB + spawned server (options go to spawnServer); runs with its origin, code and process; stops and drops in finally. */
export async function withSetupServer<T>(
	run: (s: {
		origin: string;
		setupCode: string;
		server: ServerProcess;
		databaseUrl: string;
	}) => Promise<T>,
	options?: { capabilities?: readonly string[] },
): Promise<T> {
	return withDatabase(async (databaseUrl) => {
		// Without PUBLIC_URL the server derives its address from the request.
		const server = spawnServer(
			databaseUrl,
			undefined,
			{ PUBLIC_URL: undefined },
			options,
		);
		try {
			const origin = await server.listening();
			const setupCode = setupCodeFrom(server.output());
			return await run({ origin, setupCode, server, databaseUrl });
		} finally {
			await server.stop();
		}
	});
}
