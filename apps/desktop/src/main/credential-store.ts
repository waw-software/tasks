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

/** The record as it lies on disk, `token` still sealed; null when malformed. */
function parseRecord(text: string): StoredConnection | null {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return null;
	}
	if (!isObject(value) || value.v !== 1) return null;
	const { serverUrl, token, limitedAck } = value;
	if (typeof serverUrl !== "string" || typeof token !== "string") return null;
	if (token === "" || !BASE64.test(token)) return null;
	if (!isLimitedAck(limitedAck)) return null;
	const origin = normalizeServerOrigin(serverUrl);
	if (!origin.ok || origin.value !== serverUrl) return null;
	return { serverUrl, token, limitedAck };
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
			let token: string;
			try {
				if (!box.isSecure()) return { kind: "unavailable" };
				token = box.decryptString(Buffer.from(record.token, "base64"));
			} catch {
				return { kind: "unavailable" };
			}
			if (!isDeviceToken(token)) return discardMalformed();
			return { kind: "found", connection: { ...record, token } };
		},

		async write(connection) {
			if (!box.isSecure()) throw new Error("secure storage is not available");
			const text = JSON.stringify({
				v: 1,
				serverUrl: connection.serverUrl,
				token: box.encryptString(connection.token).toString("base64"),
				limitedAck: connection.limitedAck,
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
