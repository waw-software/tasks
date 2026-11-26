import { type Static, Type } from "typebox";

// The pattern excludes the urn:uuid: form that the uuid format also accepts.
export const DeviceTokenIdSchema = Type.String({
	format: "uuid",
	pattern:
		"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
});

export const DeviceTokenSchema = Type.String({
	pattern: "^waw_dev_[A-Za-z0-9_-]{43}$",
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
