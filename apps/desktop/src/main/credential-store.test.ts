import * as realFs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	CONNECTION_FILE,
	createCredentialStore,
	secureBox,
} from "./credential-store";
import type {
	SafeStorageLike,
	SecretBox,
	StoredConnection,
	StoreFs,
} from "./types";

const TOKEN = `waw_dev_${"A".repeat(43)}`;
const SERVER = "https://x.example";

const connection: StoredConnection = {
	serverUrl: SERVER,
	token: TOKEN,
	limitedAck: { serverUrl: SERVER, capabilityKey: "tasks" },
};

/** What a failing write tries to put in place of `connection`. */
const replacement: StoredConnection = {
	serverUrl: "https://y.example",
	token: `waw_dev_${"B".repeat(43)}`,
	limitedAck: null,
};

function encrypt(plain: string): Buffer {
	return Buffer.from(`enc:${[...plain].reverse().join("")}`);
}

function decrypt(encrypted: Buffer): string {
	const text = encrypted.toString();
	if (!text.startsWith("enc:")) throw new Error("cannot decrypt");
	return [...text.slice("enc:".length)].reverse().join("");
}

function fakeBox(): SecretBox & { secure: boolean } {
	return {
		secure: true,
		isSecure() {
			return this.secure;
		},
		encryptString: encrypt,
		decryptString: decrypt,
	};
}

const sealed = (plain: string) => encrypt(plain).toString("base64");

/** What lies under the seal; each case overrides one field. */
const payload = (overrides: Record<string, unknown> = {}) =>
	JSON.stringify({ serverUrl: SERVER, token: TOKEN, ...overrides });

/** A well-formed record as it lies on disk; each case overrides one field. */
function record(overrides: Record<string, unknown> = {}): string {
	return JSON.stringify({
		v: 1,
		sealed: sealed(payload()),
		limitedAck: null,
		...overrides,
	});
}

/** A well-formed record around another sealed payload. */
const recordSealing = (plain: string) => record({ sealed: sealed(plain) });

/** What the unchanged `record()` reads as. */
const FOUND = {
	kind: "found",
	connection: { serverUrl: SERVER, token: TOKEN, limitedAck: null },
};

describe("credential store", () => {
	let dir: string;
	let target: string;

	beforeEach(async () => {
		dir = await realFs.mkdtemp(join(tmpdir(), "waw-store-"));
		target = join(dir, "connection.json");
	});

	afterEach(async () => {
		await realFs.rm(dir, { recursive: true, force: true });
	});

	it("REQ-007 AC-28: reads back what it wrote", async () => {
		const box = fakeBox();
		const store = createCredentialStore({ dir, box });

		await store.write(connection);

		expect(CONNECTION_FILE).toBe("connection.json");
		expect(await store.read()).toEqual({ kind: "found", connection });
		expect(await createCredentialStore({ dir, box }).read()).toEqual({
			kind: "found",
			connection,
		});

		const unacknowledged = { ...connection, limitedAck: null };
		await store.write(unacknowledged);

		expect(await store.read()).toEqual({
			kind: "found",
			connection: unacknowledged,
		});
	});

	it("REQ-007 AC-28: the file holds no plaintext token", async () => {
		const store = createCredentialStore({ dir, box: fakeBox() });

		await store.write(connection);

		const text = await realFs.readFile(target, "utf8");
		expect(text).not.toContain("waw_dev_");
		expect(JSON.parse(text)).toEqual({
			v: 1,
			sealed: sealed(payload()),
			limitedAck: connection.limitedAck,
		});
	});

	it("REQ-007 AC-28: the server address is sealed with the token", async () => {
		const store = createCredentialStore({ dir, box: fakeBox() });
		// A limited choice names its server in the open, so this record has none.
		const unacknowledged = { ...connection, limitedAck: null };

		await store.write(unacknowledged);

		const text = await realFs.readFile(target, "utf8");
		expect(text).not.toContain(SERVER);
		expect(text).not.toContain("waw_dev_");
		expect(JSON.parse(text)).toHaveProperty("sealed");
		expect(await store.read()).toEqual({
			kind: "found",
			connection: unacknowledged,
		});
	});

	it("REQ-007 AC-28: a record whose address lies outside the seal is removed", async () => {
		const store = createCredentialStore({ dir, box: fakeBox() });
		await realFs.writeFile(
			target,
			JSON.stringify({
				v: 1,
				serverUrl: SERVER,
				token: sealed(TOKEN),
				limitedAck: null,
			}),
		);

		expect(await store.read()).toEqual({ kind: "none" });
		expect(await realFs.readdir(dir)).toEqual([]);
	});

	it.each([
		["not JSON", "not json"],
		["missing serverUrl", payload({ serverUrl: undefined })],
		["missing token", payload({ token: undefined })],
		[
			"serverUrl not canonical",
			payload({ serverUrl: "https://evil.example/" }),
		],
		["token not a device token", payload({ token: "waw_dev_short" })],
	])(
		"REQ-007 AC-28: a sealed payload that is not a connection is removed (%s)",
		async (_name, plain) => {
			const store = createCredentialStore({ dir, box: fakeBox() });
			// The well-formed payload is found, so the case fails for its one change.
			await realFs.writeFile(target, record());
			expect(await store.read()).toEqual(FOUND);

			await realFs.writeFile(target, recordSealing(plain));

			expect(await store.read()).toEqual({ kind: "none" });
			expect(await realFs.readdir(dir)).toEqual([]);
		},
	);

	it("REQ-007 AC-28: the file is private, also when it replaces a 0644 file", async () => {
		const store = createCredentialStore({ dir, box: fakeBox() });

		await store.write(connection);
		expect((await realFs.stat(target)).mode & 0o777).toBe(0o600);

		await realFs.chmod(target, 0o644);
		await store.write(connection);

		expect((await realFs.stat(target)).mode & 0o777).toBe(0o600);
	});

	it("REQ-007 AC-28: an interrupted replacement keeps the old record and leaves no temp file", async () => {
		const box = fakeBox();
		await createCredentialStore({ dir, box }).write(connection);
		const before = await realFs.readFile(target, "utf8");
		const renames: unknown[] = [];
		const store = createCredentialStore({
			dir,
			box,
			fs: {
				readFile: realFs.readFile,
				open: realFs.open,
				rm: realFs.rm,
				rename: async (_from, to) => {
					renames.push(to);
					throw new Error("interrupted");
				},
			},
		});

		await expect(store.write(replacement)).rejects.toThrow();

		expect(renames).toEqual([target]);
		expect(await realFs.readFile(target, "utf8")).toBe(before);
		expect(await store.read()).toEqual({ kind: "found", connection });
		expect(await realFs.readdir(dir)).toEqual(["connection.json"]);
	});

	const failingOpen: StoreFs["open"] = async () => {
		throw new Error("open failed");
	};
	// The real open creates the temp file, so the store has something to clean up.
	const failingWriteFile: StoreFs["open"] = async (...args) => {
		const handle = await realFs.open(...args);
		handle.writeFile = async () => {
			throw new Error("write failed");
		};
		return handle;
	};

	it.each([
		["open rejects", failingOpen],
		["writeFile rejects", failingWriteFile],
	])(
		"REQ-007 AC-28: a failed temp write keeps the old record and leaves no temp file (%s)",
		async (_name, open) => {
			const box = fakeBox();
			await createCredentialStore({ dir, box }).write(connection);
			const store = createCredentialStore({
				dir,
				box,
				fs: {
					readFile: realFs.readFile,
					open,
					rename: realFs.rename,
					rm: realFs.rm,
				},
			});

			await expect(store.write(replacement)).rejects.toThrow();

			expect(await store.read()).toEqual({ kind: "found", connection });
			expect(await realFs.readdir(dir)).toEqual(["connection.json"]);
		},
	);

	it("REQ-007 AC-28: a read error other than a missing file reads as unavailable and keeps the file", async () => {
		const text = record();
		await realFs.writeFile(target, text);
		const store = createCredentialStore({
			dir,
			box: fakeBox(),
			fs: {
				readFile: async () => {
					throw Object.assign(new Error("permission denied"), {
						code: "EACCES",
					});
				},
				open: realFs.open,
				rename: realFs.rename,
				rm: realFs.rm,
			},
		});

		expect(await store.read()).toEqual({ kind: "unavailable" });
		expect(await realFs.readFile(target, "utf8")).toBe(text);
	});

	it("REQ-007 AC-28: no file reads as none", async () => {
		const store = createCredentialStore({ dir, box: fakeBox() });

		expect(await store.read()).toEqual({ kind: "none" });
		expect(await realFs.readdir(dir)).toEqual([]);
	});

	it("REQ-007 AC-28: a malformed record is removed and reads as none", async () => {
		const store = createCredentialStore({ dir, box: fakeBox() });

		// The unchanged fixture is well-formed, so each case fails for its one change.
		await realFs.writeFile(target, record());
		expect(await store.read()).toEqual(FOUND);

		const cases: [string, string][] = [
			["not JSON", "not json"],
			["not an object", "null"],
			["wrong version", record({ v: 2 })],
			["missing sealed", record({ sealed: undefined })],
			["sealed not a string", record({ sealed: 5 })],
			["sealed empty", record({ sealed: "" })],
			["sealed not base64", record({ sealed: "not base64!" })],
			["sealed payload not an object", recordSealing("null")],
			["missing serverUrl", recordSealing(payload({ serverUrl: undefined }))],
			["serverUrl not a string", recordSealing(payload({ serverUrl: 5 }))],
			[
				"origin not canonical",
				recordSealing(payload({ serverUrl: "https://x.example/" })),
			],
			[
				"remote http origin",
				recordSealing(payload({ serverUrl: "http://x.example" })),
			],
			["token not a string", recordSealing(payload({ token: 5 }))],
			["token empty", recordSealing(payload({ token: "" }))],
			[
				"decrypted token not a device token",
				recordSealing(payload({ token: "waw_dev_short" })),
			],
			["limitedAck a number", record({ limitedAck: 5 })],
			[
				"limitedAck without capabilityKey",
				record({ limitedAck: { serverUrl: SERVER } }),
			],
		];
		for (const [name, text] of cases) {
			await realFs.writeFile(target, text);

			expect(await store.read(), name).toEqual({ kind: "none" });
			expect(await realFs.readdir(dir), name).toEqual([]);
		}
	});

	it("REQ-007 AC-28: a keyring that is unavailable now keeps the record", async () => {
		const insecure = fakeBox();
		insecure.secure = false;
		const failing: SecretBox = {
			...fakeBox(),
			isSecure: () => true,
			decryptString: () => {
				throw new Error("keyring locked");
			},
		};
		const cases: [string, SecretBox][] = [
			["box not secure", insecure],
			["decryption throws", failing],
		];
		const text = record();

		for (const [name, box] of cases) {
			await realFs.writeFile(target, text);
			const store = createCredentialStore({ dir, box });

			expect(await store.read(), name).toEqual({ kind: "unavailable" });
			expect(await realFs.readFile(target, "utf8"), name).toBe(text);
		}
	});

	it("REQ-007 AC-28: an insecure box refuses to write", async () => {
		const box = fakeBox();
		box.secure = false;
		const store = createCredentialStore({ dir, box });

		await expect(store.write(connection)).rejects.toThrow();
		expect(await realFs.readdir(dir)).toEqual([]);

		const existing = record();
		await realFs.writeFile(target, existing);

		await expect(store.write(connection)).rejects.toThrow();
		expect(await realFs.readFile(target, "utf8")).toBe(existing);
		expect(await realFs.readdir(dir)).toEqual(["connection.json"]);
	});

	it("REQ-007 AC-28: clear removes the record and is idempotent", async () => {
		const store = createCredentialStore({ dir, box: fakeBox() });
		await store.write(connection);

		await expect(store.clear()).resolves.toBeUndefined();

		expect(await realFs.readdir(dir)).toEqual([]);
		expect(await store.read()).toEqual({ kind: "none" });
		await expect(store.clear()).resolves.toBeUndefined();
	});
});

describe("secureBox", () => {
	it("REQ-007 AC-28: secureBox treats Linux basic_text and missing encryption as not secure", () => {
		const cases: [NodeJS.Platform, boolean, string, boolean][] = [
			["darwin", true, "unknown", true],
			["linux", true, "basic_text", false],
			["linux", true, "gnome_libsecret", true],
			["win32", false, "unknown", false],
		];

		for (const [platform, available, backend, secure] of cases) {
			const storage: SafeStorageLike = {
				isEncryptionAvailable: () => available,
				getSelectedStorageBackend: () => backend,
				encryptString: encrypt,
				decryptString: decrypt,
			};
			const box = secureBox(storage, platform);
			const name = `${platform}/${backend}/${available}`;

			expect(box.isSecure(), name).toBe(secure);
			expect(box.encryptString("secret"), name).toEqual(encrypt("secret"));
			expect(box.decryptString(encrypt("secret")), name).toBe("secret");
		}
	});
});
