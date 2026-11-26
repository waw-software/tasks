import { expect, test } from "@playwright/test";

// The server serves the API and the web client on one origin.
const ORIGIN = "http://127.0.0.1:3000";

const faces = [
	{ family: "Inter", weight: "400" },
	{ family: "Inter", weight: "500" },
	{ family: "Inter", weight: "600" },
	{ family: "Space Grotesk", weight: "500" },
	{ family: "Space Grotesk", weight: "600" },
];

const viewports = [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 },
];

test("REQ-001 AC-01 REQ-010 AC-36 serves GET /health over HTTP", async ({
	request,
}) => {
	const response = await request.get(`${ORIGIN}/health`);
	expect(response.status()).toBe(200);
	expect(response.headers()["content-type"]).toContain("application/json");
	expect(await response.json()).toEqual({ apiVersion: 1, capabilities: [] });
});

test("REQ-001 AC-03 shows the web shell heading on the server origin", async ({
	page,
}) => {
	await page.goto(`${ORIGIN}/`);
	await expect(
		page
			.getByRole("main")
			.getByRole("heading", { level: 1, name: "WAW Tasks", exact: true }),
	).toBeVisible();
});

test("REQ-001 AC-03 answers 404 for missing assets and unknown API paths", async ({
	request,
}) => {
	for (const path of [
		"/assets/nope.js",
		"/fonts/nope.woff2",
		"/nope",
		"/tokens/nope/nope",
	]) {
		const response = await request.get(`${ORIGIN}${path}`);
		expect({ path, status: response.status() }).toEqual({ path, status: 404 });
	}
});

for (const viewport of viewports) {
	test(`REQ-001 AC-03 loads the five bundled typefaces at ${viewport.width}`, async ({
		page,
	}) => {
		await page.setViewportSize(viewport);
		await page.route("**/*", (route) => {
			const { origin } = new URL(route.request().url());
			return origin === ORIGIN ? route.continue() : route.abort();
		});
		const fontResponses: { origin: string; status: number }[] = [];
		page.on("response", (response) => {
			if (response.request().resourceType() === "font") {
				fontResponses.push({
					origin: new URL(response.url()).origin,
					status: response.status(),
				});
			}
		});
		await page.goto(`${ORIGIN}/`);

		const loaded = await page.evaluate(async (wanted) => {
			const results: boolean[] = [];
			for (const { family, weight } of wanted) {
				await document.fonts.load(`${weight} 16px "${family}"`, "WAW Tasks");
				let found = false;
				document.fonts.forEach((face) => {
					found ||=
						face.family.replace(/["']/g, "") === family &&
						face.weight === weight &&
						face.status === "loaded";
				});
				results.push(found);
			}
			return results;
		}, faces);

		expect(loaded).toEqual([true, true, true, true, true]);
		await expect.poll(() => fontResponses.length).toBeGreaterThanOrEqual(5);
		for (const response of fontResponses) {
			expect(response).toEqual({ origin: ORIGIN, status: 200 });
		}
		const heading = page.getByRole("heading", { level: 1, name: "WAW Tasks" });
		await expect(heading).toHaveCSS("font-family", /^"Space Grotesk"/);
		await expect(heading).toHaveCSS("font-weight", "600");
	});
}
