import { type Static, Type } from "typebox";
import {
	DEVICE_TOKEN_ID_PATTERN,
	DEVICE_TOKEN_PATTERN,
} from "./credential-patterns.js";

export const DeviceTokenIdSchema = Type.String({
	format: "uuid",
	pattern: DEVICE_TOKEN_ID_PATTERN,
});

export const DeviceTokenSchema = Type.String({
	pattern: DEVICE_TOKEN_PATTERN,
});

export const DeviceIdentitySchema = Type.Object({ id: DeviceTokenIdSchema });

export const DeviceCredentialSchema = Type.Object({
	id: DeviceTokenIdSchema,
	token: DeviceTokenSchema,
});

export const DeviceTokenParamsSchema = Type.Object({ id: DeviceTokenIdSchema });

export const UnauthorizedSchema = Type.Object({
	error: Type.Literal("unauthorized"),
});

export type DeviceIdentity = Static<typeof DeviceIdentitySchema>;
export type DeviceCredential = Static<typeof DeviceCredentialSchema>;
export type DeviceTokenParams = Static<typeof DeviceTokenParamsSchema>;
