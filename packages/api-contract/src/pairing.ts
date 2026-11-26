import { type Static, Type } from "typebox";
import { PAIRING_TOKEN_PATTERN } from "./credential-patterns.js";

export const PairingTokenSchema = Type.String({
	pattern: PAIRING_TOKEN_PATTERN,
});

export const PairingRedeemBodySchema = Type.Object(
	{ token: PairingTokenSchema },
	{ additionalProperties: false },
);

export const PairingLinkSchema = Type.Object({
	pairingLink: Type.String(),
	expiresAt: Type.String({ format: "date-time" }),
});

export const BadPublicAddressSchema = Type.Object({
	error: Type.Literal("invalid_public_address"),
});

export type PairingRedeemBody = Static<typeof PairingRedeemBodySchema>;
export type PairingLink = Static<typeof PairingLinkSchema>;
