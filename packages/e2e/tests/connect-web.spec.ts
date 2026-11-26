import { randomBytes } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { spawnServer } from "./support/server.ts";
import { withSetupServer } from "./support/setup.ts";

const SESSION_COOKIE = "waw_session";

const FOREIGN_ORIGIN = "https://evil.example";

// Longer than the helpers' own deadlines, so their errors (with the server output) surface.
test.describe.configure({ timeout: 90_000 });

// A trace, screenshot or video would keep a live token or cookie on disk. No assertion
// compares a token or cookie value directly either: a failure would print it.
test.use({ trace: "off", screenshot: "off", video: "off" });

/** Claims a fresh server and returns the owner's access token. */
async function claim(origin: string, code: string): Promise<string> {
	const response = await fetch(`${origin}/setup/claim`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ code }),
	});
	expect(response.status).toBe(201);
	const { accessToken } = (await response.json()) as { accessToken: string };
	return accessToken;
}

function bearer(token: string): { authorization: string } {
	return { authorization: `Bearer ${token}` };
}

async function currentStatus(
	origin: string,
	headers: Record<string, string>,
): Promise<number> {
	const response = await fetch(`${origin}/tokens/current`, { headers });
	return response.status;
}

function connectHeading(page: Page) {
	return page.getByRole("heading", {
		level: 1,
		name: "Connect to your server",
		exact: true,
	});
}

function shellHeading(page: Page) {
	return page.getByRole("heading", {
		level: 1,
		name: "WAW Tasks",
		exact: true,
	});
}

function updateHeading(page: Page) {
	return page.getByRole("heading", {
		level: 1,
		name: "Your server needs an update",
		exact: true,
	});
}

/** The limited-mode banner's title; on the shell nothing else carries this text. */
function limitedBannerTitle(page: Page) {
	return page.getByText("Your server needs an update", { exact: true });
}

async function expectConnect(page: Page): Promise<void> {
	await expect(connectHeading(page)).toBeVisible();
	await expect(shellHeading(page)).toHaveCount(0);
}

async function expectShell(page: Page): Promise<void> {
	await expect(shellHeading(page)).toBeVisible();
	await expect(connectHeading(page)).toHaveCount(0);
	await expect(updateHeading(page)).toHaveCount(0);
}

async function expectLimitedShell(page: Page): Promise<void> {
	await expectShell(page);
	await expect(limitedBannerTitle(page)).toBeVisible();
}

async function expectFullShell(page: Page): Promise<void> {
	await expectShell(page);
	await expect(limitedBannerTitle(page)).toHaveCount(0);
}

async function submitToken(page: Page, token: string): Promise<void> {
	// evaluate, not fill: a failed or reported fill step would quote the token.
	await page
		.getByLabel("Access token", { exact: true })
		.evaluate((element, value) => {
			const input = element as HTMLInputElement;
			// React tracks the value; the prototype setter makes it see the change.
			Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set?.call(input, value);
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}, token);
	await page.getByRole("button", { name: "Connect", exact: true }).click();
}

/** Opens the web client on a claimed server and submits the token on Connect. */
async function signIn(
	page: Page,
	origin: string,
	token: string,
): Promise<void> {
	await page.goto(`${origin}/`);
	await expectConnect(page);
	await submitToken(page, token);
}

/** The names of the browser's cookies; unlike the cookies, safe to print. */
async function cookieNames(page: Page): Promise<string[]> {
	return (await page.context().cookies()).map(({ name }) => name);
}

async function sessionCookie(page: Page) {
	const cookies = await page.context().cookies();
	const cookie = cookies.find(({ name }) => name === SESSION_COOKIE);
	if (!cookie) {
		throw new Error("The browser holds no session cookie");
	}
	return cookie;
}

/** The live session cookie as a Cookie header, to send from outside the browser. */
async function sessionCookieHeader(page: Page): Promise<string> {
	return `${SESSION_COOKIE}=${(await sessionCookie(page)).value}`;
}

/** The id of the device behind the browser's cookie. */
async function browserDeviceId(page: Page, origin: string): Promise<string> {
	const response = await page.request.get(`${origin}/tokens/current`);
	expect(response.status()).toBe(200);
	const { id } = (await response.json()) as { id: string };
	return id;
}

/** Runs `run` with a new server on a stopped server's origin and database, then stops it. */
async function withRestartedServer(
	databaseUrl: string,
	origin: string,
	capabilities: readonly string[],
	run: () => Promise<void>,
): Promise<void> {
	const server = spawnServer(
		databaseUrl,
		Number(new URL(origin).port),
		{ PUBLIC_URL: undefined },
		{ capabilities },
	);
	try {
		expect(await server.listening()).toBe(origin);
		await run();
	} finally {
		await server.stop();
	}
}

test("REQ-007 AC-28 signs in with the setup token and stays signed in on reload", async ({
	page,
}) => {
	await withSetupServer(async ({ origin, setupCode }) => {
		const token = await claim(origin, setupCode);

		await page.goto(`${origin}/`);
		await expectConnect(page);
		await expect(page.getByLabel(/server\s*(url|address)/i)).toHaveCount(0);
		await submitToken(page, token);
		await expectShell(page);

		const cookie = await sessionCookie(page);
		expect(cookie.httpOnly).toBe(true);
		expect(cookie.sameSite).toBe("Strict");
		expect(cookie.value.length > 0).toBe(true);
		// The browser is a device of its own, not a holder of the setup token.
		expect(cookie.value === token).toBe(false);
		const visibleToScripts = await page.evaluate(() => document.cookie);
		expect(visibleToScripts.includes(SESSION_COOKIE)).toBe(false);

		await page.reload();
		await expectShell(page);
	});
});

test("REQ-007 AC-28 a wrong token leaves Connect with an error", async ({
	page,
}) => {
	await withSetupServer(async ({ origin, setupCode }) => {
		await claim(origin, setupCode);

		await signIn(
			page,
			origin,
			`waw_dev_${randomBytes(32).toString("base64url")}`,
		);

		await expect(page.getByRole("alert")).toBeVisible();
		await expectConnect(page);
		expect(await cookieNames(page)).not.toContain(SESSION_COOKIE);
	});
});

test("REQ-007 AC-28 a revoked browser device returns to Connect", async ({
	page,
}) => {
	await withSetupServer(async ({ origin, setupCode }) => {
		const token = await claim(origin, setupCode);
		await signIn(page, origin, token);
		await expectShell(page);

		const id = await browserDeviceId(page, origin);
		const revoked = await fetch(`${origin}/tokens/${id}`, {
			method: "DELETE",
			headers: bearer(token),
		});
		expect(revoked.status).toBe(204);

		await page.reload();
		await expectConnect(page);
		expect(await currentStatus(origin, bearer(token))).toBe(200);
	});
});

test("REQ-007 AC-28 sign-out clears the cookie and revokes only that device", async ({
	page,
}) => {
	await withSetupServer(async ({ origin, setupCode }) => {
		const token = await claim(origin, setupCode);
		await signIn(page, origin, token);
		await expectShell(page);

		const id = await browserDeviceId(page, origin);
		const ownerResponse = await fetch(`${origin}/tokens/current`, {
			headers: bearer(token),
		});
		const owner = (await ownerResponse.json()) as { id: string };
		expect(id).not.toBe(owner.id);
		const oldCookie = await sessionCookieHeader(page);
		expect(await currentStatus(origin, { cookie: oldCookie })).toBe(200);

		await page.getByRole("button", { name: "Sign out", exact: true }).click();
		await expectConnect(page);
		expect(await cookieNames(page)).not.toContain(SESSION_COOKIE);

		await page.reload();
		await expectConnect(page);
		expect(await currentStatus(origin, bearer(token))).toBe(200);
		// The device is revoked on the server, not only forgotten by the browser.
		expect(await currentStatus(origin, { cookie: oldCookie })).toBe(401);
	});
});

test("REQ-007 AC-28 a cross-origin request with the live cookie is refused", async ({
	page,
}) => {
	await withSetupServer(async ({ origin, setupCode }) => {
		const token = await claim(origin, setupCode);
		await signIn(page, origin, token);
		await expectShell(page);
		const cookie = await sessionCookieHeader(page);

		for (const { method, headers } of [
			{ method: "DELETE", headers: {} },
			{ method: "POST", headers: bearer(token) },
		]) {
			const response = await fetch(`${origin}/session`, {
				method,
				headers: { ...headers, cookie, origin: FOREIGN_ORIGIN },
			});
			expect({ method, status: response.status }).toEqual({
				method,
				status: 403,
			});
			expect(await response.json()).toEqual({ error: "csrf_forbidden" });
			// No new session was issued and the live one was not cleared.
			expect(response.headers.has("set-cookie")).toBe(false);
		}

		await page.reload();
		await expectShell(page);

		// The server's own Origin: only the missing Bearer token can refuse these.
		for (const path of ["/tokens", "/tokens/pairing"]) {
			const response = await fetch(`${origin}${path}`, {
				method: "POST",
				headers: { cookie, origin },
			});
			expect({ path, status: response.status }).toEqual({ path, status: 401 });
		}
		// The refusals above came from a cookie that was still live.
		expect(await currentStatus(origin, { cookie })).toBe(200);
	});
});

test("REQ-010 AC-35 an old server shows the update screen; Check again reaches the shell after the update", async ({
	page,
}) => {
	await withSetupServer(
		async ({ origin, setupCode, server, databaseUrl }) => {
			const token = await claim(origin, setupCode);
			await signIn(page, origin, token);

			await expect(updateHeading(page)).toBeVisible();
			await expect(shellHeading(page)).toHaveCount(0);
			// One card for the server's API version and one for the app's.
			await expect(page.getByText("API v1")).toHaveCount(2);
			await expect(page.getByText("Waiting for the update")).toBeVisible();
			await expect(page.getByText("Connecting new devices")).toBeVisible();

			await server.stop();
			await withRestartedServer(databaseUrl, origin, ["connect"], async () => {
				await page
					.getByRole("button", { name: "Check again", exact: true })
					.click();
				await expectFullShell(page);
			});
		},
		{ capabilities: [] },
	);
});

test("REQ-010 AC-35 continue with limited features is remembered until the capability list changes", async ({
	page,
}) => {
	await withSetupServer(
		async ({ origin, setupCode, server, databaseUrl }) => {
			const token = await claim(origin, setupCode);
			await signIn(page, origin, token);
			await expect(updateHeading(page)).toBeVisible();

			await page
				.getByRole("button", {
					name: "Continue with limited features",
					exact: true,
				})
				.click();
			await expectLimitedShell(page);

			await page.reload();
			await expectLimitedShell(page);

			await server.stop();
			// Another list that still lacks "connect".
			await withRestartedServer(databaseUrl, origin, ["future-x"], async () => {
				await page.reload();
				await expect(updateHeading(page)).toBeVisible();
				await expect(shellHeading(page)).toHaveCount(0);
			});
		},
		{ capabilities: [] },
	);
});

test("REQ-010 AC-34 a server with the capability opens the shell directly", async ({
	page,
}) => {
	await withSetupServer(async ({ origin, setupCode }) => {
		const token = await claim(origin, setupCode);

		await signIn(page, origin, token);

		await expectFullShell(page);
	});
});
