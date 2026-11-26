import { type Static, Type } from "typebox";
import { DeviceTokenSchema } from "./device-auth.js";

export const SetupCodeSchema = Type.String({
	pattern: "^waw_setup_[A-Za-z0-9_-]{43}$",
});

export const SetupClaimBodySchema = Type.Object(
	{ code: SetupCodeSchema },
	{ additionalProperties: false },
);

export const SetupClaimResponseSchema = Type.Object({
	serverUrl: Type.String(),
	accessToken: DeviceTokenSchema,
	pairingLink: Type.String(),
	qrDataUrl: Type.String({ pattern: "^data:image/png;base64," }),
});

export const SetupClosedSchema = Type.Object({
	error: Type.Literal("setup_closed"),
});

export const HttpsRequiredSchema = Type.Object({
	error: Type.Literal("https_required"),
});

export type SetupClaimBody = Static<typeof SetupClaimBodySchema>;
export type SetupClaimResponse = Static<typeof SetupClaimResponseSchema>;
