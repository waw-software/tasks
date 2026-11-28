import type {
	CredentialStore,
	SafeStorageLike,
	SecretBox,
	StoreFs,
} from "./types";

export const CONNECTION_FILE = "connection.json";

export function secureBox(
	_storage: SafeStorageLike,
	_platform: NodeJS.Platform,
): SecretBox {
	throw new Error("not implemented: secureBox");
}

export function createCredentialStore(_opts: {
	dir: string;
	box: SecretBox;
	fs?: StoreFs;
}): CredentialStore {
	throw new Error("not implemented: createCredentialStore");
}
