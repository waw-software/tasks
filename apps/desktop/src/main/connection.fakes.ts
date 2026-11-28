// Test support for the desktop connection tests: an in-memory credential store and
// a scripted server behind a Transport.
import type { HealthResponse } from "@waw/api-contract/connect";
import type {
	CredentialStore,
	RequestFn,
	StoredConnection,
	StoreRead,
	Transport,
} from "./types";

export const ORIGIN = "https://tasks.example.test";
export const OWNER_TOKEN = `waw_dev_${"O".repeat(43)}`;
export const MINTED = {
	id: "11111111-1111-4111-8111-111111111111",
	token: `waw_dev_${"M".repeat(43)}`,
};
export const PAIRING_LINK = `https://tasks.example.test/pair#token=waw_pair_${"P".repeat(43)}`;
export const HEALTH_FULL: HealthResponse = {
	apiVersion: 1,
	capabilities: ["connect"],
};
export const HEALTH_OLD: HealthResponse = { apiVersion: 1, capabilities: [] };

/** Only the stored fields, detached from the caller's object, as a file would be. */
function snapshot(connection: StoredConnection): StoredConnection {
	const { serverUrl, token, limitedAck } = connection;
	return {
		serverUrl,
		token,
		limitedAck: limitedAck === null ? null : { ...limitedAck },
	};
}

function copyRead(read: StoreRead): StoreRead {
	return read.kind === "found"
		? { kind: "found", connection: snapshot(read.connection) }
		: { kind: read.kind };
}

/** A write takes longer than a clear, so a write that is not awaited lands late. */
async function slowDisk(): Promise<void> {
	for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

export function memoryStore(
	initial: StoreRead = { kind: "none" },
): CredentialStore & {
	writes: StoredConnection[]; // successful writes, oldest first
	clears: number; // calls of clear(), failed ones included
	failWrites: boolean;
	failClears: boolean;
	file(): StoredConnection | null; // what is "on disk"
} {
	let disk = copyRead(initial);
	const store = {
		writes: [] as StoredConnection[],
		clears: 0,
		failWrites: false,
		failClears: false,
		file: () => (disk.kind === "found" ? snapshot(disk.connection) : null),
		read: async () => copyRead(disk),
		write: async (connection: StoredConnection) => {
			const record = snapshot(connection);
			await slowDisk();
			if (store.failWrites) throw new Error("write failed");
			store.writes.push(record);
			disk = { kind: "found", connection: snapshot(record) };
		},
		clear: async () => {
			store.clears += 1;
			if (store.failClears) throw new Error("clear failed");
			disk = { kind: "none" };
		},
	};
	return store;
}

type FakeRequest = {
	method: string;
	url: string;
	headers: Record<string, string>;
	body?: string;
};

/** "throw": the request fails at once. "hang": no answer until the abort. */
export type FakeRoute = { status: number; body?: unknown } | "throw" | "hang";

/** The WAW server's answer to a token it refuses. */
export const REFUSED: FakeRoute = {
	status: 401,
	body: { error: "unauthorized" },
};

/**
 * Routes are keyed "METHOD /path" and read on every request, so a test changes
 * the server by changing the object it passed. A missing route answers 404.
 */
export function fakeServer(routes: Record<string, FakeRoute>): {
	transport: Transport;
	requests: FakeRequest[];
} {
	const requests: FakeRequest[] = [];
	const request: RequestFn = async (url, init) => {
		const { method, body, signal } = init;
		requests.push({
			method,
			url,
			headers: { ...init.headers },
			...(body === undefined ? {} : { body }),
		});
		if (signal.aborted) throw new Error("aborted");
		const route = routes[`${method} ${new URL(url).pathname}`] ?? {
			status: 404,
		};
		if (route === "throw") throw new Error("network failure");
		if (route === "hang") {
			return new Promise<never>((_resolve, reject) => {
				signal.addEventListener("abort", () => reject(new Error("aborted")), {
					once: true,
				});
			});
		}
		return { status: route.status, json: async () => route.body };
	};
	const transport: Transport = {
		run: async (exchange, options) => {
			const unreachable = { ok: false, error: "unreachable" } as const;
			const controller = new AbortController();
			const timer = setTimeout(
				() => controller.abort(),
				options?.timeoutMs ?? 10_000,
			);
			try {
				const result = await exchange(request, controller.signal);
				return controller.signal.aborted ? unreachable : result;
			} catch {
				return unreachable;
			} finally {
				clearTimeout(timer);
			}
		},
	};
	return { transport, requests };
}
