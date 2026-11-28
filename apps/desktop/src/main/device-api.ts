import type { Failure, RequestFn } from "./types";

export function currentDevice(
	_request: RequestFn,
	_signal: AbortSignal,
	_serverUrl: string,
	_token: string,
): Promise<{ ok: true; id: string } | Failure> {
	throw new Error("not implemented: currentDevice");
}

export function mintDevice(
	_request: RequestFn,
	_signal: AbortSignal,
	_serverUrl: string,
	_token: string,
): Promise<{ ok: true; id: string; token: string } | Failure> {
	throw new Error("not implemented: mintDevice");
}

export function revokeDevice(
	_request: RequestFn,
	_signal: AbortSignal,
	_serverUrl: string,
	_token: string,
	_id: string,
): Promise<{ ok: true } | Failure> {
	throw new Error("not implemented: revokeDevice");
}
