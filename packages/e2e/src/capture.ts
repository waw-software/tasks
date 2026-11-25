import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { needsGalleryBuild, parseArgs, type FsChecks } from "./args.ts";
import { captureElectron } from "./capture-electron.ts";
import { captureIos } from "./capture-ios.ts";
import { captureWeb, type WebCapture } from "./capture-web.ts";
import { screens } from "./screens.ts";

function fail(message: string): never {
	process.stderr.write(`capture: ${message}\n`);
	process.exit(1);
}

function build(
	repoRoot: string,
	pkg: string,
	env: Record<string, string> = {},
): void {
	const result = spawnSync(
		join(repoRoot, "scripts/project/pnpm.sh"),
		["--filter", pkg, "build"],
		{
			cwd: repoRoot,
			env: { ...process.env, ...env },
			stdio: ["ignore", process.stderr, process.stderr],
		},
	);
	if (result.status !== 0) throw new Error(`build of ${pkg} failed`);
}

try {
	const top = spawnSync("git", ["rev-parse", "--show-toplevel"], {
		cwd: process.cwd(),
		encoding: "utf8",
	});
	if (top.status !== 0) throw new Error("not inside a git repository");
	const repoRoot = top.stdout.trim();

	const realFs: FsChecks = {
		exists: (p) => existsSync(join(repoRoot, p)),
		isIgnored: (dir) =>
			spawnSync("git", ["check-ignore", "-q", "--", dir], { cwd: repoRoot })
				.status === 0,
	};
	const request = parseArgs(process.argv.slice(2), screens, realFs, repoRoot);
	const { outDir } = request;
	mkdirSync(outDir, { recursive: true });

	const web = request.screens.filter((s) => s.surface === "web");
	const electron = request.screens.filter((s) => s.surface === "electron");
	if (web.length > 0 || electron.length > 0) {
		// Always explicit: the process env wins over a Vite env file.
		build(repoRoot, "@waw/web", {
			VITE_WAW_GALLERY: needsGalleryBuild(request.screens) ? "1" : "0",
		});
	}
	if (electron.length > 0) build(repoRoot, "@waw/desktop");

	const actual = new Map<string, string>();
	const unavailable = new Set<string>();
	if (web.length > 0) {
		const items: WebCapture[] = web.map((s) => {
			if (s.surface !== "web") throw new Error("unreachable");
			return {
				id: s.id,
				route: s.route,
				viewport: s.viewport,
				readyHeading: s.readyHeading,
			};
		});
		const paths = await captureWeb(items, outDir, repoRoot);
		for (const [i, item] of items.entries())
			actual.set(item.id, paths[i] as string);
	}
	for (const s of electron) {
		if (s.surface !== "electron") continue;
		actual.set(
			s.id,
			await captureElectron(
				{
					id: s.id,
					readyHeading: s.readyHeading,
					...(s.hash === undefined ? {} : { hash: s.hash }),
				},
				outDir,
				repoRoot,
			),
		);
	}
	for (const s of request.screens) {
		if (s.surface !== "ios" || request.iosConflict) continue;
		const destination = join(outDir, `${s.id}.actual.png`);
		if (captureIos(request.iosDevice, destination) === "captured")
			actual.set(s.id, destination);
		else unavailable.add(s.id);
	}

	const rel = (p: string) => relative(repoRoot, p);
	for (const s of request.screens) {
		if (s.surface === "ios" && request.iosConflict) {
			process.stdout.write(
				`SKIP ${s.id}: more than one iOS screen selected; capture one iOS screen per run\n`,
			);
			continue;
		}
		if (unavailable.has(s.id)) {
			process.stdout.write(`SKIP ${s.id}: simctl unavailable\n`);
			continue;
		}
		const shot = rel(actual.get(s.id) as string);
		if (s.mockup === null) {
			process.stdout.write(`${s.id}\t${shot}\tno mockup\t-\n`);
			continue;
		}
		const copy = join(outDir, `${s.id}.mockup.png`);
		copyFileSync(join(repoRoot, s.mockup), copy);
		process.stdout.write(`${s.id}\t${shot}\t${rel(copy)}\t${s.mockup}\n`);
	}
} catch (error) {
	fail(error instanceof Error ? error.message : String(error));
}
