import { type Static, Type } from "typebox";
import { type DeviceIdentity, DeviceIdentitySchema } from "./device-auth.js";
import { HttpsRequiredSchema } from "./setup.js";

export const SESSION_COOKIE = "waw_session";

export const SessionCreatedSchema = DeviceIdentitySchema;

export const CsrfForbiddenSchema = Type.Object({
	error: Type.Literal("csrf_forbidden"),
});

export const SessionForbiddenSchema = Type.Union([
	CsrfForbiddenSchema,
	HttpsRequiredSchema,
]);

export const SessionActiveSchema = Type.Object({
	error: Type.Literal("session_active"),
});

export type SessionCreated = DeviceIdentity;
export type SessionForbidden = Static<typeof SessionForbiddenSchema>;
