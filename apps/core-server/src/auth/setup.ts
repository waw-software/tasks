import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SetupClaimResponse } from "@waw/api-contract";
import QRCode from "qrcode";
import { setupClaim } from "../db/schema.ts";
import { makePairingLink } from "../public-url.ts";
import { type AppDb, issueDeviceToken } from "./device-store.ts";
import { issuePairingToken } from "./pairing-store.ts";

export type SetupClaimResult =
	| { kind: "claimed"; data: SetupClaimResponse }
	| { kind: "invalid" }
	| { kind: "closed" };

export interface SetupService {
	isClaimed(): Promise<boolean>;
	claim(code: string, serverUrl: string): Promise<SetupClaimResult>;
}

function digest(code: string): Buffer {
	return createHash("sha256").update(code).digest();
}

/**
 * Claims the installation and issues its first credentials in one transaction. The
 * insert waits for a concurrent one, so only one claim gets a row. Returns null when
 * the installation is already claimed.
 */
function claimInstallation(
	db: AppDb,
	serverUrl: string,
): Promise<SetupClaimResponse | null> {
	return db.transaction(async (tx) => {
		const inserted = await tx
			.insert(setupClaim)
			.values({ id: 1 })
			.onConflictDoNothing()
			.returning({ id: setupClaim.id });
		if (inserted.length === 0) return null;
		const device = await issueDeviceToken(tx);
		const pairing = await issuePairingToken(tx);
		const pairingLink = makePairingLink(serverUrl, pairing.token);
		return {
			serverUrl,
			accessToken: device.token,
			pairingLink,
			qrDataUrl: await QRCode.toDataURL(pairingLink),
		};
	});
}

/**
 * On an unclaimed database: creates the one-time setup code, passes it to logCode and
 * keeps only its SHA-256 digest in memory. On a claimed one there is no code.
 */
export async function prepareSetup(
	db: AppDb,
	logCode: (code: string) => void,
): Promise<SetupService> {
	let claimed = false;
	let codeDigest: Buffer | undefined;

	// A claim is permanent, so only the unclaimed answer is read again.
	async function isClaimed(): Promise<boolean> {
		if (claimed) return true;
		const rows = await db.select().from(setupClaim).limit(1);
		if (rows.length > 0) claimed = true;
		return claimed;
	}

	if (!(await isClaimed())) {
		const code = `waw_setup_${randomBytes(32).toString("base64url")}`;
		codeDigest = digest(code);
		logCode(code);
	}

	return {
		isClaimed,
		async claim(code, serverUrl) {
			await isClaimed();
			// The flag, not the read's result: a concurrent claim can finish meanwhile
			// and drop the digest, and that must answer closed.
			if (claimed) return { kind: "closed" };
			if (
				codeDigest === undefined ||
				!timingSafeEqual(digest(code), codeDigest)
			) {
				return { kind: "invalid" };
			}
			const data = await claimInstallation(db, serverUrl);
			claimed = true;
			codeDigest = undefined;
			return data === null ? { kind: "closed" } : { kind: "claimed", data };
		},
	};
}
