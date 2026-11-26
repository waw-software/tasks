import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const root = fileURLToPath(new URL("../..", import.meta.url));

if (!process.env.DATABASE_URL) {
	throw new Error(
		"DATABASE_URL must point to a disposable PostgreSQL database for the e2e tests",
	);
}

export default defineConfig({
	testDir: "tests",
	testMatch: [
		"smoke.spec.ts",
		"migrations.spec.ts",
		"auth.spec.ts",
		"runtime.spec.ts",
		"pairing.spec.ts",
	],
	retries: 0,
	workers: 1,
	forbidOnly: true,
	outputDir: "out/playwright/smoke",
	reporter: [
		["list"],
		["html", { outputFolder: "out/playwright/smoke-report", open: "never" }],
	],
	use: { baseURL: "http://127.0.0.1:3000" },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	// The web build comes first: this server and the ones the specs spawn serve it.
	webServer: {
		command:
			"scripts/project/pnpm.sh --filter @waw/api-contract --filter @waw/core-worker --filter @waw/core-server --filter @waw/web build && HOST=127.0.0.1 PORT=3000 node apps/core-server/dist/index.js",
		port: 3000,
		cwd: root,
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
