import { describe, expect, it } from "vitest";
import { readServerConfig, redactDatabaseUrl } from "../src/db/config.js";

const databaseUrl = "postgres://waw:s3cret@localhost:5432/waw";

function errorMessage(env: NodeJS.ProcessEnv): string {
	try {
		readServerConfig(env);
	} catch (error) {
		return (error as Error).message;
	}
	throw new Error("expected readServerConfig to throw");
}

describe("readServerConfig", () => {
	it("REQ-011 AC-38: reads DATABASE_URL and keeps the default host and port", () => {
		expect(readServerConfig({ DATABASE_URL: databaseUrl })).toEqual({
			databaseUrl,
			host: "127.0.0.1",
			port: 3000,
		});
	});

	it("REQ-011 AC-38: takes HOST and PORT, including port 0", () => {
		const env = { DATABASE_URL: databaseUrl, HOST: "0.0.0.0" };

		expect(readServerConfig({ ...env, PORT: "8080" })).toEqual({
			databaseUrl,
			host: "0.0.0.0",
			port: 8080,
		});
		expect(readServerConfig({ ...env, PORT: "0" }).port).toBe(0);
		expect(readServerConfig({ ...env, PORT: "65535" }).port).toBe(65535);
	});

	it("REQ-011 AC-38: rejects a missing DATABASE_URL", () => {
		expect(errorMessage({})).toBe("DATABASE_URL is not set");
	});

	it.each([
		"mysql://u:s3cret@h/db",
		"not a url s3cret",
		"postgres:",
		"postgres:typo",
		"postgresql:/db",
		"postgres:///db",
	])(
		"REQ-011 AC-38: rejects a non-PostgreSQL DATABASE_URL without echoing it (%#)",
		(url) => {
			const message = errorMessage({ DATABASE_URL: url });

			expect(message).toBe("DATABASE_URL is not a valid PostgreSQL URL");
			expect(message).not.toContain("s3cret");
		},
	);

	it.each(["abc", "3000.5", "-1", "65536", ""])(
		"REQ-011 AC-38: rejects invalid ports (%j)",
		(port) => {
			expect(errorMessage({ DATABASE_URL: databaseUrl, PORT: port })).toBe(
				"PORT must be an integer from 0 to 65535",
			);
		},
	);
});

describe("redactDatabaseUrl", () => {
	it("REQ-011 AC-38: redacts the URL and the password from a message", () => {
		const url = "postgresql://waw:p%40ss@db:5432/waw";
		const text = `cannot use ${url}; password p%40ss or p@ss; again p@ss`;

		expect(redactDatabaseUrl(text, url)).toBe(
			"cannot use ***; password *** or ***; again ***",
		);
	});

	it("REQ-011 AC-38: leaves a message unchanged when the URL has no password", () => {
		expect(redactDatabaseUrl("refused", "postgres://db/waw")).toBe("refused");
	});
});
