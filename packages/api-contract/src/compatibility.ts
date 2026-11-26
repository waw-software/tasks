import { API_VERSION } from "./api-version.js";
import type { HealthResponse } from "./health.js";

export const KNOWN_CAPABILITIES = ["connect"] as const;
export type KnownCapability = (typeof KNOWN_CAPABILITIES)[number];
export const APP_API_VERSION: number = API_VERSION;
export const CAPABILITY_LABELS: Readonly<Record<KnownCapability, string>> = {
	connect: "Connecting new devices",
};

export function capabilitiesFromHealth(health: HealthResponse): {
	hasCapability(name: string): boolean;
} {
	return { hasCapability: (name) => health.capabilities.includes(name) };
}

export function missingCapabilities(
	health: HealthResponse,
	known: readonly string[] = KNOWN_CAPABILITIES,
): KnownCapability[] {
	const { hasCapability } = capabilitiesFromHealth(health);
	return known.filter((name) => !hasCapability(name)) as KnownCapability[];
}

/** True when the server needs an update. A newer server API version alone does not. */
export function evaluateServerCompatibility(
	health: HealthResponse,
	appApiVersion: number,
	known: readonly string[] = KNOWN_CAPABILITIES,
): boolean {
	return (
		health.apiVersion < appApiVersion ||
		missingCapabilities(health, known).length > 0
	);
}

export function needsServerUpdate(health: HealthResponse): boolean {
	return evaluateServerCompatibility(health, APP_API_VERSION);
}

/** The user's "continue with limited features", valid for one server and its capability set. */
export type LimitedAck = { serverUrl: string; capabilityKey: string };

export function capabilityKey(health: HealthResponse): string {
	return JSON.stringify([...new Set(health.capabilities)].sort());
}

/** `serverUrl` is a normalized origin; another server's record is neither accepted nor cleared. */
export function reconcileLimitedAck(
	ack: LimitedAck | null,
	serverUrl: string,
	health: HealthResponse,
): { accepted: boolean; clear: boolean } {
	if (ack === null || ack.serverUrl !== serverUrl) {
		return { accepted: false, clear: false };
	}
	const accepted = ack.capabilityKey === capabilityKey(health);
	return { accepted, clear: !accepted };
}
