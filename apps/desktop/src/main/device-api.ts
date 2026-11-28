import {
	decodeDeviceCredential,
	decodeDeviceIdentity,
} from "@waw/api-contract/connect";
import type { Failure, HttpReply, RequestFn, RequestInitLike } from "./types";

type Reply = { status: number; body: unknown };

function authorization(token: string): Record<string, string> {
	return { authorization: `Bearer ${token}` };
}

/**
 * One authorized request. The body is read only on `bodyStatus`. Null when the
 * request or the read throws; the error is dropped, it can name the URL or a header.
 */
async function send(
	request: RequestFn,
	url: string,
	init: Pick<RequestInitLike, "method" | "headers" | "signal">,
	bodyStatus?: number,
): Promise<Reply | null> {
	try {
		const response: HttpReply = await request(url, {
			...init,
			redirect: "error",
		});
		const { status } = response;
		const body = status === bodyStatus ? await response.json() : undefined;
		return { status, body };
	} catch {
		return null;
	}
}

/** The failure of a reply that is not the expected one. */
function refusal(reply: Reply | null): Failure {
	if (reply === null) return { ok: false, error: "unreachable" };
	return {
		ok: false,
		error: reply.status === 401 ? "unauthorized" : "invalid-response",
	};
}

export async function currentDevice(
	request: RequestFn,
	signal: AbortSignal,
	serverUrl: string,
	token: string,
): Promise<{ ok: true; id: string } | Failure> {
	const reply = await send(
		request,
		`${serverUrl}/tokens/current`,
		{
			method: "GET",
			headers: { accept: "application/json", ...authorization(token) },
			signal,
		},
		200,
	);
	// The body is undefined on every other status, which no decoder accepts.
	const identity = decodeDeviceIdentity(reply?.body);
	return identity === null ? refusal(reply) : { ok: true, id: identity.id };
}

export async function mintDevice(
	request: RequestFn,
	signal: AbortSignal,
	serverUrl: string,
	token: string,
): Promise<{ ok: true; id: string; token: string } | Failure> {
	const reply = await send(
		request,
		`${serverUrl}/tokens`,
		{
			method: "POST",
			headers: { accept: "application/json", ...authorization(token) },
			signal,
		},
		201,
	);
	const credential = decodeDeviceCredential(reply?.body);
	return credential === null
		? refusal(reply)
		: { ok: true, id: credential.id, token: credential.token };
}

export async function revokeDevice(
	request: RequestFn,
	signal: AbortSignal,
	serverUrl: string,
	token: string,
	id: string,
): Promise<{ ok: true } | Failure> {
	const reply = await send(
		request,
		`${serverUrl}/tokens/${encodeURIComponent(id)}`,
		{ method: "DELETE", headers: authorization(token), signal },
	);
	return reply?.status === 204 ? { ok: true } : refusal(reply);
}
