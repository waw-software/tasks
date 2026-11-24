import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { _electron } from "playwright";

export type ElectronCapture = { id: string; readyHeading: string };

const URL_TIMEOUT_MS = 15_000;
const HEADING_TIMEOUT_MS = 15_000;
const POLL_MS = 100;
const MISSING_BINARY =
	"Electron binary missing: run pnpm --filter @waw/desktop exec install-electron";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveExecutable(desktopDir: string): string {
	let electronDir: string;
	try {
		const require = createRequire(join(desktopDir, "package.json"));
		electronDir = dirname(require.resolve("electron/package.json"));
	} catch {
		throw new Error(MISSING_BINARY);
	}
	const pathFile = join(electronDir, "path.txt");
	if (!existsSync(pathFile)) {
		throw new Error(MISSING_BINARY);
	}
	const executable = join(
		electronDir,
		"dist",
		readFileSync(pathFile, "utf8").trim(),
	);
	if (!existsSync(executable)) {
		throw new Error(MISSING_BINARY);
	}
	return executable;
}

export async function captureElectron(
	item: ElectronCapture,
	outDir: string,
	repoRoot: string,
): Promise<string> {
	const desktopDir = join(repoRoot, "apps/desktop");
	const mainFile = join(desktopDir, "out/main/index.js");
	if (!existsSync(mainFile)) {
		throw new Error(
			`desktop build missing: ${mainFile}; run pnpm --filter @waw/desktop build`,
		);
	}
	const webIndex = join(repoRoot, "apps/web/dist/index.html");
	if (!existsSync(webIndex)) {
		throw new Error(
			`web build missing: ${webIndex}; run pnpm --filter @waw/web build`,
		);
	}
	const executablePath = resolveExecutable(desktopDir);

	const app = await _electron.launch({
		executablePath,
		args: [desktopDir],
		cwd: desktopDir,
	});
	try {
		const win = await app.firstWindow();
		const expected = pathToFileURL(webIndex).href;
		const deadline = Date.now() + URL_TIMEOUT_MS;
		while (win.url() !== expected && Date.now() < deadline) {
			await sleep(POLL_MS);
		}
		if (win.url() !== expected) {
			throw new Error(
				`desktop window loaded ${win.url()}, expected ${expected}`,
			);
		}
		await win
			.getByRole("heading", { level: 1, name: item.readyHeading, exact: true })
			.waitFor({ state: "visible", timeout: HEADING_TIMEOUT_MS });
		const path = join(outDir, `${item.id}.actual.png`);
		await win.screenshot({ path, animations: "disabled" });
		return path;
	} finally {
		await app.close();
	}
}
