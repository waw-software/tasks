export interface ServerConfig {
	databaseUrl: string;
	host: string;
	port: number;
}

/** Throws Error whose message never contains the value of DATABASE_URL. */
export function readServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not set");
	}
	// Without "//" and a host, pg falls back to a local default database.
	if (
		!/^postgres(ql)?:\/\//.test(databaseUrl) ||
		!URL.parse(databaseUrl)?.hostname
	) {
		throw new Error("DATABASE_URL is not a valid PostgreSQL URL");
	}
	const port = env.PORT ?? "3000";
	if (!/^\d+$/.test(port) || Number(port) > 65535) {
		throw new Error("PORT must be an integer from 0 to 65535");
	}
	return { databaseUrl, host: env.HOST ?? "127.0.0.1", port: Number(port) };
}

/** Replaces every occurrence of databaseUrl and of its password (raw and URL-decoded) in text with "***". */
export function redactDatabaseUrl(text: string, databaseUrl: string): string {
	const password = URL.parse(databaseUrl)?.password;
	// The URL goes first: once its password is replaced, it no longer matches.
	const secrets = password
		? [databaseUrl, password, decodePassword(password)]
		: [databaseUrl];
	return secrets.reduce(
		(redacted, secret) => redacted.replaceAll(secret, "***"),
		text,
	);
}

// A lone "%" is valid in a URL password but cannot be decoded.
function decodePassword(password: string): string {
	return password.replace(/(%[0-9a-f]{2})+/gi, (encoded) => {
		return Buffer.from(encoded.replaceAll("%", ""), "hex").toString("utf8");
	});
}
