import { defineConfig } from "@playwright/test";

// Drives docker-compose.yml with Docker: it needs no DATABASE_URL and no web server of its own.
export default defineConfig({
	testDir: "tests",
	testMatch: ["deploy.spec.ts"],
	retries: 0,
	workers: 1,
	forbidOnly: true,
	outputDir: "out/playwright/deploy",
	reporter: [
		["list"],
		["html", { outputFolder: "out/playwright/deploy-report", open: "never" }],
	],
});
