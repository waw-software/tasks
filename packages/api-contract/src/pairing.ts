import { type Static, Type } from "typebox";

export const PairingTokenSchema = Type.String({
	pattern: "^waw_pair_[A-Za-z0-9_-]{43}$",
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
