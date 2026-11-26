import { type Static, Type } from "typebox";

export { API_VERSION } from "./api-version.js";

export const HealthResponseSchema = Type.Object({
	apiVersion: Type.Integer({ minimum: 1 }),
	capabilities: Type.Array(Type.String()),
});

export type HealthResponse = Static<typeof HealthResponseSchema>;
