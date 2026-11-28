import { randomUUID } from "node:crypto";
import * as nodeFs from "node:fs/promises";
import { join } from "node:path";
import {
	isDeviceToken,
	type LimitedAck,
	normalizeServerOrigin,
} from "@waw/api-contract/connect";
import type {
	CredentialStore,
	SafeStorageLike,
	SecretBox,
	StoredConnection,
	StoreFs,
} from "./types";

export const CONNECTION_FILE = "connection.json";

const BASE64 =
	/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function secureBox(
	storage: SafeStorageLike,
	platform: NodeJS.Platform,
): SecretBox {
	return {
		isSecure: () =>
			storage.isEncryptionAvailable() &&
			!(
				platform === "linux" &&
				storage.getSelectedStorageBackend() === "basic_text"
			),
		encryptString: (plain) => storage.encryptString(plain),
		decryptString: (encrypted) => storage.decryptString(encrypted),
	};
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isLimitedAck(value: unknown): value is LimitedAck | null {
	return (
		value === null ||
		(isObject(value) &&
			typeof value.serverUrl === "string" &&
			typeof value.capabilityKey === "string")
	);
}

/** The record as it lies on disk. */
type SealedRecord = { sealed: string; limitedAck: LimitedAck | null };

/** What lies under the seal: the address is bound to its token. */
type SealedPayload = Pick<StoredConnection, "serverUrl" | "token">;

/** Undefined, which no check below accepts, when the text is not JSON. */
function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/** Null when malformed. */
function parseRecord(text: string): SealedRecord | null {
	const value = parseJson(text);
	if (!isObject(value) || value.v !== 1) return null;
	const { sealed, limitedAck } = value;
	if (typeof sealed !== "string") return null;
	if (sealed === "" || !BASE64.test(sealed)) return null;
	if (!isLimitedAck(limitedAck)) return null;
	return { sealed, limitedAck };
}

/** The decrypted seal; null when malformed. */
function parsePayload(text: string): SealedPayload | null {
	const value = parseJson(text);
	if (!isObject(value)) return null;
	const { serverUrl, token } = value;
	if (typeof serverUrl !== "string" || typeof token !== "string") return null;
	const origin = normalizeServerOrigin(serverUrl);
	if (!origin.ok || origin.value !== serverUrl) return null;
	if (!isDeviceToken(token)) return null;
	return { serverUrl, token };
}

export function createCredentialStore(opts: {
	dir: string;
	box: SecretBox;
	fs?: StoreFs;
}): CredentialStore {
	const { dir, box, fs = nodeFs } = opts;
	const target = join(dir, CONNECTION_FILE);

	const clear = () => fs.rm(target, { force: true });

	async function discardMalformed(): Promise<{ kind: "none" }> {
		await clear();
		return { kind: "none" };
	}

	return {
		async read() {
			let text: string;
			try {
				text = await fs.readFile(target, "utf8");
			} catch (error) {
				// A filesystem problem is not proof of a malformed record.
				return isObject(error) && error.code === "ENOENT"
					? { kind: "none" }
					: { kind: "unavailable" };
			}
			const record = parseRecord(text);
			if (record === null) return discardMalformed();
			let opened: string;
			try {
				if (!box.isSecure()) return { kind: "unavailable" };
				opened = box.decryptString(Buffer.from(record.sealed, "base64"));
			} catch {
				return { kind: "unavailable" };
			}
			const payload = parsePayload(opened);
			if (payload === null) return discardMalformed();
			return {
				kind: "found",
				connection: { ...payload, limitedAck: record.limitedAck },
			};
		},

		async write(connection) {
			if (!box.isSecure()) throw new Error("secure storage is not available");
			const { serverUrl, token, limitedAck } = connection;
			const sealed = box.encryptString(JSON.stringify({ serverUrl, token }));
			const text = JSON.stringify({
				v: 1,
				sealed: sealed.toString("base64"),
				limitedAck,
			});
			const temp = `${target}.${randomUUID()}.tmp`;
			try {
				const handle = await fs.open(temp, "wx", 0o600);
				try {
					await handle.writeFile(text);
				} finally {
					await handle.close();
				}
				await fs.rename(temp, target);
			} catch (error) {
				await fs.rm(temp, { force: true });
				throw error;
			}
		},

		clear,
	};
}
