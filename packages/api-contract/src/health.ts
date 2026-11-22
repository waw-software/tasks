import { type Static, Type } from "typebox";

export const API_VERSION = 1;

export const HealthResponseSchema = Type.Object({
	apiVersion: Type.Integer({ minimum: 1 }),
	capabilities: Type.Array(Type.String()),
});

export type HealthResponse = Static<typeof HealthResponseSchema>;
