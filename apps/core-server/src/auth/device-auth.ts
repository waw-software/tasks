import { type DeviceIdentity, DeviceTokenSchema } from "@waw/api-contract";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type AppDb, findDeviceToken } from "./device-store.ts";

declare module "fastify" {
	interface FastifyRequest {
		device: DeviceIdentity | null;
	}
}

// The scheme is case-insensitive; the token is not.
const BEARER = /^bearer +(\S+)$/i;
// TString does not type its options, so the pattern is read through a narrower type.
const DEVICE_TOKEN = new RegExp(
	(DeviceTokenSchema as unknown as { pattern: string }).pattern,
);

export function requireDevice(
	db: AppDb,
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
	return async (request, reply) => {
		const token = BEARER.exec(request.headers.authorization ?? "")?.[1];
		const device =
			token !== undefined && DEVICE_TOKEN.test(token)
				? await findDeviceToken(db, token)
				: null;
		if (!device) {
			// Awaiting the reply stops the request here.
			await reply
				.code(401)
				.header("www-authenticate", "Bearer")
				.send({ error: "unauthorized" });
			return;
		}
		request.device = device;
	};
}
