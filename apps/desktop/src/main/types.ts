import type * as fsPromises from "node:fs/promises";
import type {
	ConnectError,
	DesktopBridge,
	HealthResponse,
	LimitedAck,
} from "@waw/api-contract/connect";

/** The parts of Electron's safeStorage the store uses. */
export type SafeStorageLike = {
	isEncryptionAvailable(): boolean;
	getSelectedStorageBackend(): string;
	encryptString(plain: string): Buffer;
	decryptString(encrypted: Buffer): string;
};
export type SecretBox = {
	/** False when nothing may be saved: no encryption, or Linux basic_text. */
	isSecure(): boolean;
	encryptString(plain: string): Buffer;
	decryptString(encrypted: Buffer): string;
};
export type StoredConnection = {
	serverUrl: string; // canonical origin: normalizeServerOrigin(serverUrl) returns it unchanged
	token: string; // matches DEVICE_TOKEN_PATTERN; plaintext only in memory
	limitedAck: LimitedAck | null;
};
export type StoreRead =
	| { kind: "none" } // no file, or a malformed record that was removed
	| { kind: "found"; connection: StoredConnection }
	| { kind: "unavailable" }; // a well-formed record that cannot be decrypted now; kept
export type CredentialStore = {
	read(): Promise<StoreRead>;
	/** Atomic, private replacement. Rejects (target unchanged) when the box is not secure or a file operation fails. */
	write(connection: StoredConnection): Promise<void>;
	/** Removes the record; resolves when there is none. */
	clear(): Promise<void>;
};
export type StoreFs = Pick<
	typeof fsPromises,
	"readFile" | "open" | "rename" | "rm"
>;

export type Failure = {
	ok: false;
	error: ConnectError;
	health?: HealthResponse;
};
export type RequestInitLike = {
	method: "GET" | "POST" | "DELETE";
	headers: Record<string, string>;
	body?: string;
	redirect: "error";
	signal: AbortSignal;
};
export type HttpReply = { status: number; json(): Promise<unknown> };
/** What exchanges call; assignable to ConnectFetch<AbortSignal>. */
export type RequestFn = (
	url: string,
	init: RequestInitLike,
) => Promise<HttpReply>;
/** The platform fetch main passes in (Electron net.fetch). */
export type DesktopFetch = (
	url: string,
	init: RequestInitLike & { credentials: "omit"; cache: "no-store" },
) => Promise<HttpReply>;
export type Transport = {
	/** One exchange under one timeout (default from createTransport; override per call). */
	run<T>(
		exchange: (request: RequestFn, signal: AbortSignal) => Promise<T>,
		options?: { timeoutMs?: number },
	): Promise<T | Failure>;
};
export type DesktopConnection = DesktopBridge["connect"] & {
	/** Clean quit: best-effort revoke of a memory-only credential; never rejects. */
	discard(timeoutMs: number): Promise<void>;
};
