import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

describe("readServerConfig with DATABASE_PASSWORD_FILE", () => {
	const url = "postgres://waw@postgres:5432/waw";
	let directory: string;

	beforeAll(() => {
		directory = mkdtempSync(join(tmpdir(), "waw-db-config-"));
	});

	afterAll(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	function passwordFile(name: string, content: string): string {
		const path = join(directory, name);
		writeFileSync(path, content);
		return path;
	}

	it("REQ-011 AC-37: builds the database URL from DATABASE_PASSWORD_FILE", () => {
		// "%41" must survive as three characters, not turn into "A".
		for (const password of ["p@ss/wörd", "a:b?c#d%41 e"]) {
			const { databaseUrl } = readServerConfig({
				DATABASE_URL: url,
				DATABASE_PASSWORD_FILE: passwordFile("password", `${password}\n`),
			});

			const encoded = new URL(databaseUrl).password;
			expect(encoded).toBe(encodeURIComponent(password));
			expect(decodeURIComponent(encoded)).toBe(password);
			expect(databaseUrl).toBe(`postgres://waw:${encoded}@postgres:5432/waw`);
		}
	});

	it("REQ-011 AC-37: rejects an unreadable or empty password file and a URL that already has a password, without echoing either", () => {
		const secret = passwordFile("secret", "f1le-s3cret\n");
		const cases = [
			{
				url,
				file: join(directory, "missing"),
				message: "DATABASE_PASSWORD_FILE cannot be read",
			},
			{
				url,
				file: directory,
				message: "DATABASE_PASSWORD_FILE cannot be read",
			},
			{
				url,
				file: passwordFile("empty", ""),
				message: "DATABASE_PASSWORD_FILE is empty",
			},
			{
				url,
				file: passwordFile("newline", "\n"),
				message: "DATABASE_PASSWORD_FILE is empty",
			},
			{
				url: databaseUrl,
				file: secret,
				message:
					"DATABASE_URL must not contain a password when DATABASE_PASSWORD_FILE is set",
			},
			{
				url: `${url}?password=s3cret`,
				file: secret,
				message:
					"DATABASE_URL must not contain a password when DATABASE_PASSWORD_FILE is set",
			},
			{
				url: "postgres://postgres:5432/waw",
				file: secret,
				message:
					"DATABASE_URL must name a user when DATABASE_PASSWORD_FILE is set",
			},
		];

		for (const { url, file, message } of cases) {
			expect(
				errorMessage({ DATABASE_URL: url, DATABASE_PASSWORD_FILE: file }),
			).toBe(message);
		}
	});
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
