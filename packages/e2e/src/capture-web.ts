import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { join } from "node:path";
import { chromium } from "playwright";

export type WebCapture = {
	id: string;
	route: string;
	viewport: { width: number; height: number };
	readyHeading: string;
};

const HOST = "127.0.0.1";
const PORT = 4174;
const BASE_URL = `http://${HOST}:${PORT}`;
const READY_TIMEOUT_MS = 30_000;
const POLL_MS = 250;
const HEADING_TIMEOUT_MS = 15_000;
const KILL_GRACE_MS = 5_000;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function killGroup(child: ChildProcess, signal: NodeJS.Signals): void {
	if (child.pid === undefined) {
		return;
	}
	try {
		process.kill(-child.pid, signal);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ESRCH") {
			throw error;
		}
	}
}

async function waitForReady(
	exited: () => number | null | undefined,
	output: () => string,
): Promise<void> {
	const deadline = Date.now() + READY_TIMEOUT_MS;
	while (Date.now() < deadline) {
		const code = exited();
		if (code !== undefined) {
			throw new Error(
				`web preview exited before it was ready (code ${String(code)}):\n${output()}`,
			);
		}
		try {
			const response = await fetch(`${BASE_URL}/`);
			// The preview's own "Local: http://127.0.0.1:4174/" line proves the 200 comes from it,
			// not from another server that already holds the port.
			if (
				response.status === 200 &&
				exited() === undefined &&
				output().includes(BASE_URL)
			) {
				return;
			}
		} catch {
			// not listening yet
		}
		await sleep(POLL_MS);
	}
	throw new Error(
		`web preview was not ready after ${READY_TIMEOUT_MS} ms:\n${output()}`,
	);
}

async function stopPreview(
	child: ChildProcess,
	hasExited: () => boolean,
): Promise<void> {
	if (hasExited()) {
		killGroup(child, "SIGTERM");
		return;
	}
	const exit = new Promise<void>((resolve) =>
		child.once("exit", () => resolve()),
	);
	killGroup(child, "SIGTERM");
	const timedOut = await Promise.race([
		exit.then(() => false),
		sleep(KILL_GRACE_MS).then(() => true),
	]);
	if (timedOut) {
		killGroup(child, "SIGKILL");
		await exit;
	}
	killGroup(child, "SIGTERM");
}

export async function captureWeb(
	items: readonly WebCapture[],
	outDir: string,
	repoRoot: string,
): Promise<string[]> {
	if (items.length === 0) {
		return [];
	}
	const child = spawn(
		join(repoRoot, "scripts/project/pnpm.sh"),
		[
			"--filter",
			"@waw/web",
			"exec",
			"vite",
			"preview",
			"--host",
			HOST,
			"--port",
			String(PORT),
			"--strictPort",
		],
		{ cwd: repoRoot, detached: true, stdio: ["ignore", "pipe", "pipe"] },
	);
	let collected = "";
	child.stdout.on("data", (chunk: Buffer) => {
		collected += chunk.toString();
	});
	child.stderr.on("data", (chunk: Buffer) => {
		collected += chunk.toString();
	});
	let exitCode: number | null | undefined;
	child.once("exit", (code) => {
		exitCode = code;
	});
	child.once("error", (error) => {
		collected += String(error);
		exitCode = null;
	});

	let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
	try {
		await waitForReady(
			() => exitCode,
			() => collected,
		);
		browser = await chromium.launch();
		const written: string[] = [];
		for (const item of items) {
			const context = await browser.newContext({
				viewport: item.viewport,
				deviceScaleFactor: 1,
			});
			try {
				const page = await context.newPage();
				await page.goto(BASE_URL + item.route);
				await page
					.getByRole("heading", {
						level: 1,
						name: item.readyHeading,
						exact: true,
					})
					.waitFor({ state: "visible", timeout: HEADING_TIMEOUT_MS });
				const path = join(outDir, `${item.id}.actual.png`);
				await page.screenshot({ path, animations: "disabled" });
				written.push(path);
			} finally {
				await context.close();
			}
		}
		return written;
	} finally {
		try {
			await browser?.close();
		} finally {
			await stopPreview(child, () => exitCode !== undefined);
		}
	}
}
