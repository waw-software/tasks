import type { CredentialStore, DesktopConnection, Transport } from "./types";

export function createDesktopConnection(_opts: {
	store: CredentialStore;
	transport: Transport;
	/** Called once when a removal of the record failed; no path, no token. */
	onStoreProblem?: (what: "clear-failed") => void;
}): DesktopConnection {
	throw new Error("not implemented: createDesktopConnection");
}
