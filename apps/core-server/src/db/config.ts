import { readFileSync } from "node:fs";

export interface ServerConfig {
	databaseUrl: string;
	host: string;
	port: number;
}

/** Throws Error whose message never contains the value of DATABASE_URL or the password. */
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
	const passwordFile = env.DATABASE_PASSWORD_FILE;
	return {
		databaseUrl: passwordFile
			? withPasswordFile(databaseUrl, passwordFile)
			: databaseUrl,
		host: env.HOST ?? "127.0.0.1",
		port: Number(port),
	};
}

function withPasswordFile(databaseUrl: string, passwordFile: string): string {
	const url = new URL(databaseUrl);
	// pg also takes a password from the query.
	if (url.password || url.searchParams.has("password")) {
		throw new Error(
			"DATABASE_URL must not contain a password when DATABASE_PASSWORD_FILE is set",
		);
	}
	if (!url.username) {
		throw new Error(
			"DATABASE_URL must name a user when DATABASE_PASSWORD_FILE is set",
		);
	}
	// The setter leaves "%" as it is, and pg would decode what follows it.
	url.password = encodeURIComponent(readPassword(passwordFile));
	return url.href;
}

function readPassword(passwordFile: string): string {
	let content: string;
	try {
		content = readFileSync(passwordFile, "utf8");
	} catch {
		throw new Error("DATABASE_PASSWORD_FILE cannot be read");
	}
	const password = content.replace(/[\r\n]+$/, "");
	if (!password) {
		throw new Error("DATABASE_PASSWORD_FILE is empty");
	}
	return password;
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
