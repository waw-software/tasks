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
	testMatch: ["smoke.spec.ts", "migrations.spec.ts"],
	retries: 0,
	workers: 1,
	forbidOnly: true,
	outputDir: "out/playwright/smoke",
	reporter: [
		["list"],
		["html", { outputFolder: "out/playwright/smoke-report", open: "never" }],
	],
	use: { baseURL: "http://127.0.0.1:4173" },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: [
		{
			command:
				"scripts/project/pnpm.sh --filter @waw/api-contract build && scripts/project/pnpm.sh --filter @waw/core-server build && HOST=127.0.0.1 PORT=3000 node apps/core-server/dist/index.js",
			port: 3000,
			cwd: root,
			reuseExistingServer: false,
			timeout: 120_000,
		},
		{
			command:
				"scripts/project/pnpm.sh --filter @waw/web exec vite build --outDir out/e2e-smoke && scripts/project/pnpm.sh --filter @waw/web exec vite preview --outDir out/e2e-smoke --host 127.0.0.1 --port 4173 --strictPort",
			url: "http://127.0.0.1:4173/",
			cwd: root,
			reuseExistingServer: false,
			timeout: 120_000,
		},
	],
});
