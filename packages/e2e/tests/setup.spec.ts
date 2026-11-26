import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, type Page, test } from "@playwright/test";
import jsQR from "jsqr";
import { spawnServer } from "./support/server.ts";
import {
	isSetupCodeLine,
	setupCodeFrom,
	withSetupServer,
} from "./support/setup.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));

const DEVICE_TOKEN_PATTERN = /^waw_dev_[A-Za-z0-9_-]{43}$/;

// Longer than the helpers' own deadlines, so their errors (with the server output) surface.
test.describe.configure({ timeout: 90_000 });

// A trace, screenshot or video would keep a live code or token on disk.
test.use({ trace: "off", screenshot: "off", video: "off" });

interface Claim {
	serverUrl: string;
	accessToken: string;
	pairingLink: string;
	qrDataUrl: string;
}

function claim(origin: string, code: string): Promise<Response> {
	return fetch(`${origin}/setup/claim`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ code }),
	});
}

function redeem(origin: string, token: string): Promise<Response> {
	return fetch(`${origin}/tokens/pairing/redeem`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ token }),
	});
}

function currentToken(origin: string, token: string): Promise<Response> {
	return fetch(`${origin}/tokens/current`, {
		headers: { authorization: `Bearer ${token}` },
	});
}

function get(url: string): Promise<Response> {
	return fetch(url, { redirect: "manual" });
}

async function expectRedirect(url: string, location: string): Promise<void> {
	const response = await get(url);
	expect(response.status).toBe(302);
	expect(response.headers.get("location")).toBe(location);
}

async function expectShell(origin: string): Promise<void> {
	const response = await get(`${origin}/`);
	expect(response.status).toBe(200);
	expect(response.headers.get("content-type")).toContain("text/html");
}

async function expectClosed(response: Response): Promise<void> {
	expect(response.status).toBe(409);
	expect(await response.json()).toEqual({ error: "setup_closed" });
}

/** The RGBA pixels of a loaded image, as Chromium draws them. */
async function pixelsOf(page: Page, name: string) {
	const { data, width, height } = await page
		.getByRole("img", { name })
		.evaluate(async (element) => {
			const image = element as HTMLImageElement;
			await image.decode();
			const canvas = document.createElement("canvas");
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext("2d");
			if (!context) {
				throw new Error("No 2d canvas context");
			}
			context.drawImage(image, 0, 0);
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
			return {
				data: Array.from(pixels.data),
				width: pixels.width,
				height: pixels.height,
			};
		});
	return { data: Uint8ClampedArray.from(data), width, height };
}

test("REQ-011 AC-39 opens setup on a fresh server and reveals the four items after the code", async ({
	page,
}) => {
	await withSetupServer(async ({ origin, setupCode }) => {
		await page.goto(`${origin}/`);
		await expect(page).toHaveURL(`${origin}/setup`);
		const setupHeading = page.getByRole("heading", {
			level: 1,
			name: "Set up WAW Tasks",
		});
		await expect(setupHeading).toBeVisible();
		const codeInput = page.getByLabel("Setup code");
		const submit = page.getByRole("button", { name: "Show access token" });
		const accessToken = page.getByLabel("Access token");
		await expect(accessToken).toHaveCount(0);

		await codeInput.fill(`waw_setup_${randomBytes(32).toString("base64url")}`);
		await submit.click();
		await expect(
			page.getByRole("alert").filter({ hasText: "That code is not right." }),
		).toBeVisible();
		await expect(setupHeading).toBeVisible();
		await expect(accessToken).toHaveCount(0);

		// evaluate, not fill: a failed or reported fill step would quote the code.
		await codeInput.evaluate((element, value) => {
			const input = element as HTMLInputElement;
			// React tracks the value; the prototype setter makes it see the change.
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set?.call(input, value);
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}, setupCode);
		await submit.click();
		await expect(
			page.getByRole("heading", { level: 1, name: "Connect your devices" }),
		).toBeVisible();
		const qr = page.getByRole("img", { name: "QR code for the pairing link" });
		await expect(qr).toBeVisible();

		const serverAddress = await page.getByLabel("Server address").inputValue();
		expect(serverAddress).toBe(origin);
		const token = await accessToken.inputValue();
		expect(DEVICE_TOKEN_PATTERN.test(token)).toBe(true);
		expect((await currentToken(origin, token)).status).toBe(200);

		// Pairing links are HTTPS even on a plain-HTTP server.
		const link = await page.getByLabel("Pairing link").inputValue();
		const linkPrefix = `${origin.replace(/^http:/, "https:")}/pair#token=`;
		expect(link.startsWith(linkPrefix)).toBe(true);
		const pairingToken = link.slice(linkPrefix.length);
		expect(/^waw_pair_[A-Za-z0-9_-]{43}$/.test(pairingToken)).toBe(true);

		const { data, width, height } = await pixelsOf(
			page,
			"QR code for the pairing link",
		);
		// jsqr is CommonJS: its default import is the module, the decoder its `default`.
		expect(jsQR.default(data, width, height)?.data === link).toBe(true);

		const redeemed = await redeem(origin, pairingToken);
		expect(redeemed.status).toBe(201);
		const paired = (await redeemed.json()) as { token: string };
		expect(DEVICE_TOKEN_PATTERN.test(paired.token)).toBe(true);
		expect(paired.token === token).toBe(false);
		expect((await currentToken(origin, paired.token)).status).toBe(200);
		expect((await redeem(origin, pairingToken)).status).toBe(401);
	});
});

test("REQ-011 AC-39 admits one claim and stays closed after restart and revocation", async () => {
	await withSetupServer(async ({ origin, setupCode, server, databaseUrl }) => {
		await expectRedirect(`${origin}/`, "/setup");

		const responses = await Promise.all([
			claim(origin, setupCode),
			claim(origin, setupCode),
		]);
		const [winner, loser] = responses.sort((a, b) => a.status - b.status) as [
			Response,
			Response,
		];
		expect(winner.status).toBe(201);
		const { accessToken } = (await winner.json()) as Claim;
		await expectClosed(loser);

		await expectRedirect(`${origin}/setup`, "/");
		await expectShell(origin);
		await expectClosed(await claim(origin, setupCode));
		const current = await currentToken(origin, accessToken);
		expect(current.status).toBe(200);
		const { id } = (await current.json()) as { id: string };
		await server.stop();

		await promisify(execFile)(
			process.execPath,
			["apps/core-server/dist/auth/token-cli.js", "revoke", id],
			{
				cwd: root,
				env: { ...process.env, DATABASE_URL: databaseUrl },
				timeout: 30_000,
			},
		);

		const restarted = spawnServer(databaseUrl, undefined, {
			PUBLIC_URL: undefined,
		});
		try {
			const secondOrigin = await restarted.listening();
			expect((await currentToken(secondOrigin, accessToken)).status).toBe(401);
			expect(restarted.output().split("\n").some(isSetupCodeLine)).toBe(false);
			await expectShell(secondOrigin);
			await expectRedirect(`${secondOrigin}/setup`, "/");
			await expectClosed(await claim(secondOrigin, setupCode));
		} finally {
			await restarted.stop();
		}
	});
});

test("keeps the setup code and tokens out of the request log and the HTML", async () => {
	await withSetupServer(async ({ origin, setupCode, server }) => {
		const page = await get(`${origin}/setup`);
		expect(page.status).toBe(200);
		expect(page.headers.get("cache-control")).toContain("no-store");
		const html = await page.text();
		expect(html.includes(setupCode)).toBe(false);
		expect(/waw_(setup|dev|pair)_[A-Za-z0-9_-]{43}/.test(html)).toBe(false);

		const response = await claim(origin, setupCode);
		expect(response.status).toBe(201);
		expect(response.headers.get("cache-control")).toContain("no-store");
		const { accessToken, pairingLink } = (await response.json()) as Claim;
		const pairingToken = pairingLink.slice(pairingLink.indexOf("=") + 1);
		expect((await currentToken(origin, accessToken)).status).toBe(200);
		await server.stop();

		// The output is complete once stopped. The requests were logged at all.
		const output = server.output();
		expect(output.includes("request completed")).toBe(true);
		expect(setupCodeFrom(output) === setupCode).toBe(true);
		const rest = output
			.split("\n")
			.filter((line) => !isSetupCodeLine(line))
			.join("\n");
		for (const secret of [setupCode, accessToken, pairingToken]) {
			expect(rest.includes(secret)).toBe(false);
		}
	});
});
