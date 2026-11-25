import { relative, resolve, sep } from "node:path";
import type { Screen } from "./screens.ts";

export type CaptureRequest = {
	outDir: string;
	screens: Screen[];
	iosDevice: string | undefined;
};
export type FsChecks = {
	exists(repoRelativePath: string): boolean;
	isIgnored(repoRelativeDir: string): boolean;
};

export function parseArgs(
	argv: readonly string[],
	manifest: readonly Screen[],
	fs: FsChecks,
	repoRoot: string,
): CaptureRequest {
	let out: string | undefined;
	let iosDevice: string | undefined;
	const ids: string[] = [];

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i] as string;
		if (arg !== "--out" && arg !== "--screen" && arg !== "--ios-device") {
			throw new Error(`unknown option: ${arg}`);
		}
		const value = argv[++i];
		if (value === undefined) throw new Error(`${arg} needs a value`);
		if (arg === "--out") {
			if (out !== undefined) throw new Error("--out given twice");
			out = value;
		} else if (arg === "--ios-device") {
			if (iosDevice !== undefined) throw new Error("--ios-device given twice");
			iosDevice = value;
		} else {
			ids.push(value);
		}
	}

	if (out === undefined) throw new Error("--out <dir> is required");
	const outDir = resolve(repoRoot, out);
	const rel = relative(repoRoot, outDir);
	if (
		rel === "" ||
		rel === ".." ||
		rel.startsWith(`..${sep}`) ||
		resolve(rel) === rel
	) {
		throw new Error("--out must be inside the repository");
	}
	if (!fs.isIgnored(`${rel.split(sep).join("/")}/`)) {
		throw new Error(
			`--out ${out} is not ignored by git; use a directory under out/ or .ship/`,
		);
	}

	const known = manifest.map((s) => s.id);
	const seen = new Set<string>();
	for (const id of ids) {
		if (!known.includes(id))
			throw new Error(`unknown screen: ${id}; known: ${known.join(", ")}`);
		if (seen.has(id)) throw new Error(`screen given twice: ${id}`);
		seen.add(id);
	}
	const selected =
		ids.length === 0
			? [...manifest]
			: ids.map((id) => manifest.find((s) => s.id === id) as Screen);

	for (const s of selected) {
		if (s.mockup !== null && !fs.exists(s.mockup)) {
			throw new Error(`mockup missing for ${s.id}: ${s.mockup}`);
		}
	}
	return { outDir, screens: selected, iosDevice };
}
