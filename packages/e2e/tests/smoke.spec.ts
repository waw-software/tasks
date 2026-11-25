import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3000";

test("REQ-001 AC-01 serves GET /health over HTTP", async ({ request }) => {
	const response = await request.get(`${API}/health`);
	expect(response.status()).toBe(200);
	expect(response.headers()["content-type"]).toContain("application/json");
	expect(await response.json()).toEqual({ apiVersion: 1, capabilities: [] });
});

test("REQ-001 AC-03 shows the web shell heading in Chromium", async ({
	page,
}) => {
	await page.goto("/");
	await expect(
		page
			.getByRole("main")
			.getByRole("heading", { level: 1, name: "WAW Tasks", exact: true }),
	).toBeVisible();
});
