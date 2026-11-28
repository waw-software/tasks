import {
	type ConnectionView,
	type ConnectResult,
	capabilityKey,
	connect,
	type HealthResponse,
	type LimitedAck,
	normalizeServerOrigin,
	parsePairingLink,
	probeHealth,
	reconcileLimitedAck,
} from "@waw/api-contract/connect";
import { currentDevice, mintDevice, revokeDevice } from "./device-api";
import type {
	CredentialStore,
	DesktopConnection,
	StoredConnection,
	StoreRead,
	Transport,
} from "./types";

/** The one active credential. */
type Active = {
	serverUrl: string;
	token: string;
	limitedAck: LimitedAck | null;
	persisted: boolean;
	health: HealthResponse | null; // the last fresh /health of this run
};

const signedOut = (): { ok: true; value: null } => ({ ok: true, value: null });

export function createDesktopConnection(opts: {
	store: CredentialStore;
	transport: Transport;
	/** Called once when a removal of the record failed; no path, no token. */
	onStoreProblem?: (what: "clear-failed") => void;
}): DesktopConnection {
	const { store, transport, onStoreProblem } = opts;
	let active: Active | null = null;
	let storeRead = false;
	/** A removal failed, so the disk may still hold an older record. */
	let removalPending = false;
	let tail: Promise<unknown> = Promise.resolve();

	/** Runs the steps one at a time, so writes and clears happen in call order. */
	function queued<T>(step: () => Promise<T>): Promise<T> {
		const result = tail.then(step, step);
		tail = result;
		return result;
	}

	async function readStore(): Promise<StoreRead> {
		try {
			return await store.read();
		} catch {
			// Show Connect for this run; the error is dropped, it can name the path.
			return { kind: "unavailable" };
		}
	}

	async function removeRecord(): Promise<void> {
		try {
			await store.clear();
			removalPending = false;
		} catch {
			removalPending = true;
			onStoreProblem?.("clear-failed");
		}
	}

	async function save(credential: Active): Promise<void> {
		const { serverUrl, token, limitedAck } = credential;
		const record: StoredConnection = { serverUrl, token, limitedAck };
		try {
			await store.write(record);
			credential.persisted = true;
			// The write replaced whatever was left on disk.
			removalPending = false;
		} catch {
			credential.persisted = false;
			// A relaunch must never restore an older connection.
			await removeRecord();
		}
	}

	async function forget(credential: Active): Promise<void> {
		active = null;
		if (credential.persisted || removalPending) await removeRecord();
	}

	/** Drops a limited choice that no longer fits this health. */
	async function view(
		credential: Active,
		health: HealthResponse,
	): Promise<ConnectionView> {
		const { accepted, clear } = reconcileLimitedAck(
			credential.limitedAck,
			credential.serverUrl,
			health,
		);
		if (clear) {
			credential.limitedAck = null;
			if (credential.persisted) await save(credential);
		}
		return {
			serverUrl: credential.serverUrl,
			health,
			persisted: credential.persisted,
			limitedAccepted: accepted,
		};
	}

	/** Checks the token, then reads a fresh health. A refused token is forgotten. */
	async function verify(
		credential: Active,
	): Promise<ConnectResult<ConnectionView>> {
		const { serverUrl, token } = credential;
		const device = await transport.run((request, signal) =>
			currentDevice(request, signal, serverUrl, token),
		);
		if (!device.ok) {
			if (device.error === "unauthorized") await forget(credential);
			return device;
		}
		const health = await transport.run((request, signal) =>
			probeHealth(serverUrl, request, signal),
		);
		if (!health.ok) return health;
		credential.health = health.value;
		return { ok: true, value: await view(credential, health.value) };
	}

	return {
		load: () =>
			queued(async () => {
				if (!storeRead) {
					storeRead = true;
					const record = await readStore();
					if (record.kind === "found") {
						active = { ...record.connection, persisted: true, health: null };
					}
				}
				if (active === null) return signedOut();
				const result = await verify(active);
				// `verify` forgets a refused token: Connect is shown, not an error.
				return !result.ok && result.error === "unauthorized"
					? signedOut()
					: result;
			}),

		recheck: () =>
			queued(async () =>
				active === null ? { ok: false, error: "unauthorized" } : verify(active),
			),

		submit: (input) =>
			queued(async () => {
				const connected = await transport.run((request, signal) =>
					connect(input, request, signal),
				);
				if (!connected.ok) return connected;
				const { serverUrl, health } = connected.value;
				let { token } = connected.value;
				if (input.kind === "manual") {
					// The owner's token is never kept: the desktop gets its own.
					const ownerToken = token;
					const minted = await transport.run((request, signal) =>
						mintDevice(request, signal, serverUrl, ownerToken),
					);
					if (!minted.ok) return minted;
					token = minted.token;
				}
				const credential: Active = {
					serverUrl,
					token,
					limitedAck: null,
					persisted: false,
					health,
				};
				active = credential;
				// A later load must not replace this credential with a stored one.
				storeRead = true;
				await save(credential);
				return { ok: true, value: await view(credential, health) };
			}),

		acknowledgeLimited: () =>
			queued(async () => {
				const credential = active;
				const health = credential?.health;
				if (!credential || !health) {
					return { ok: false, error: "invalid-response" };
				}
				credential.limitedAck = {
					serverUrl: credential.serverUrl,
					capabilityKey: capabilityKey(health),
				};
				if (credential.persisted) await save(credential);
				return { ok: true, value: await view(credential, health) };
			}),

		signOut: () =>
			queued(async () => {
				const credential = active;
				if (credential === null) {
					if (removalPending) await removeRecord();
					return signedOut();
				}
				const { serverUrl, token } = credential;
				const device = await transport.run((request, signal) =>
					currentDevice(request, signal, serverUrl, token),
				);
				const revoked = device.ok
					? await transport.run((request, signal) =>
							revokeDevice(request, signal, serverUrl, token, device.id),
						)
					: device;
				// A token the server already refuses needs no revoke.
				if (!revoked.ok && revoked.error !== "unauthorized") return revoked;
				await forget(credential);
				return signedOut();
			}),

		probe: async (text) => {
			const link = parsePairingLink(text);
			const origin = link.ok
				? ({ ok: true, value: link.value.origin } as const)
				: normalizeServerOrigin(text);
			if (!origin.ok) return origin;
			const serverUrl = origin.value;
			const health = await transport.run((request, signal) =>
				probeHealth(serverUrl, request, signal),
			);
			return health.ok
				? { ok: true, value: { serverUrl, health: health.value } }
				: health;
		},

		discard: (timeoutMs) => {
			// The limit runs from this call, also while an earlier step is running.
			const calledAt = performance.now();
			let expired = false;
			let timer: ReturnType<typeof setTimeout> | undefined;
			const deadline = new Promise<void>((resolve) => {
				timer = setTimeout(() => {
					expired = true;
					resolve();
				}, timeoutMs);
			});
			const revoked = queued(async () => {
				const credential = active;
				if (credential === null || credential.persisted) return;
				const remainingMs = timeoutMs - (performance.now() - calledAt);
				if (expired || remainingMs <= 0) return;
				const { serverUrl, token } = credential;
				// Best effort: the result does not matter, the app is quitting.
				await transport.run(
					async (request, signal) => {
						const device = await currentDevice(
							request,
							signal,
							serverUrl,
							token,
						);
						return device.ok
							? revokeDevice(request, signal, serverUrl, token, device.id)
							: device;
					},
					{ timeoutMs: remainingMs },
				);
				active = null;
			});
			return Promise.race([revoked, deadline]).finally(() =>
				clearTimeout(timer),
			);
		},
	};
}
