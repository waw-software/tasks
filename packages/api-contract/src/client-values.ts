// Client decoders for v1 replies: they ignore added fields and use no TypeBox at runtime.
import {
	DEVICE_TOKEN_ID_PATTERN,
	DEVICE_TOKEN_PATTERN,
} from "./credential-patterns.js";
import type { DeviceCredential, DeviceIdentity } from "./device-auth.js";
import type { HealthResponse } from "./health.js";

const deviceTokenId = new RegExp(DEVICE_TOKEN_ID_PATTERN);
const deviceToken = new RegExp(DEVICE_TOKEN_PATTERN);

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matches(value: unknown, pattern: RegExp): value is string {
	return typeof value === "string" && pattern.test(value);
}

export function decodeHealth(value: unknown): HealthResponse | null {
	if (!isObject(value)) return null;
	const { apiVersion, capabilities } = value;
	if (
		typeof apiVersion !== "number" ||
		!Number.isInteger(apiVersion) ||
		apiVersion < 1
	) {
		return null;
	}
	if (
		!Array.isArray(capabilities) ||
		!capabilities.every((name): name is string => typeof name === "string")
	) {
		return null;
	}
	return { apiVersion, capabilities };
}

export function decodeDeviceIdentity(value: unknown): DeviceIdentity | null {
	if (!isObject(value)) return null;
	const { id } = value;
	return matches(id, deviceTokenId) ? { id } : null;
}

export function decodeDeviceCredential(
	value: unknown,
): DeviceCredential | null {
	if (!isObject(value)) return null;
	const { id, token } = value;
	return matches(id, deviceTokenId) && matches(token, deviceToken)
		? { id, token }
		: null;
}
