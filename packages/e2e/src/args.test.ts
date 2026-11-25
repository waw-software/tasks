import { describe, expect, it } from "vitest";
import { needsGalleryBuild, parseArgs, type FsChecks } from "./args.ts";
import { screens as realScreens, type Screen } from "./screens.ts";

const root = "/repo";
const manifest: readonly Screen[] = [
	{
		id: "a.web",
		surface: "web",
		route: "/",
		viewport: { width: 1, height: 2 },
		readyHeading: "H",
		mockup: "docs/design/screens/a.png",
	},
	{ id: "b.ios", surface: "ios", mockup: null },
	{ id: "c.electron", surface: "electron", readyHeading: "H", mockup: null },
];

function fakeFs(over: Partial<{ existing: string[]; ignored: boolean }> = {}) {
	const asked: string[] = [];
	const fs: FsChecks = {
		exists: (p) => (over.existing ?? ["docs/design/screens/a.png"]).includes(p),
		isIgnored: (p) => {
			asked.push(p);
			return over.ignored ?? true;
		},
	};
	return { fs, asked };
}

const run = (argv: string[], fs: FsChecks = fakeFs().fs) =>
	parseArgs(argv, manifest, fs, root);

describe("parseArgs", () => {
	it("C4 requires --out", () => {
		expect(() => run([])).toThrow("--out <dir> is required");
	});

	it("C4 resolves a relative --out from the repository root", () => {
		expect(run(["--out", "out/visual/x"]).outDir).toBe("/repo/out/visual/x");
	});

	it("C4 rejects an --out outside the repository", () => {
		expect(() => run(["--out", "../elsewhere"])).toThrow(
			"--out must be inside the repository",
		);
		expect(() => run(["--out", "/tmp/x"])).toThrow(
			"--out must be inside the repository",
		);
	});

	it("C4 rejects an --out that git does not ignore", () => {
		const { fs, asked } = fakeFs({ ignored: false });
		expect(() => run(["--out", "docs/x"], fs)).toThrow(
			"--out docs/x is not ignored by git; use a directory under out/ or .ship/",
		);
		expect(asked).toEqual(["docs/x/"]);
	});

	it("C4 rejects an unknown screen and lists the known ones", () => {
		expect(() => run(["--out", "out/x", "--screen", "nope"])).toThrow(
			"unknown screen: nope; known: a.web, b.ios, c.electron",
		);
	});

	it("C4 rejects a screen given twice", () => {
		expect(() =>
			run(["--out", "out/x", "--screen", "b.ios", "--screen", "b.ios"]),
		).toThrow("screen given twice: b.ios");
	});

	it("C4 rejects an unknown option and an option without a value", () => {
		expect(() => run(["--out", "out/x", "--bogus"])).toThrow(
			"unknown option: --bogus",
		);
		expect(() => run(["--out"])).toThrow("--out needs a value");
		expect(() => run(["--out", "out/x", "--screen"])).toThrow(
			"--screen needs a value",
		);
	});

	it("C4 selects every screen when none is given, in manifest order", () => {
		expect(run(["--out", "out/x"]).screens.map((s) => s.id)).toEqual([
			"a.web",
			"b.ios",
			"c.electron",
		]);
	});

	it("C4 keeps the given order", () => {
		const req = run([
			"--out",
			"out/x",
			"--screen",
			"c.electron",
			"--screen",
			"a.web",
		]);
		expect(req.screens.map((s) => s.id)).toEqual(["c.electron", "a.web"]);
	});

	it("C4 rejects a selected screen whose mockup is missing", () => {
		const { fs } = fakeFs({ existing: [] });
		expect(() => run(["--out", "out/x", "--screen", "a.web"], fs)).toThrow(
			"mockup missing for a.web: docs/design/screens/a.png",
		);
		expect(
			run(["--out", "out/x", "--screen", "b.ios"], fs).screens,
		).toHaveLength(1);
	});

	it("C4 reads --ios-device", () => {
		expect(run(["--out", "out/x", "--ios-device", "UDID-1"]).iosDevice).toBe(
			"UDID-1",
		);
		expect(run(["--out", "out/x"]).iosDevice).toBeUndefined();
	});

	it("C4 flags a selection of more than one iOS screen", () => {
		const twoIos: readonly Screen[] = [
			{ id: "a.ios", surface: "ios", mockup: null },
			{ id: "b.ios", surface: "ios", mockup: null },
			{
				id: "c.electron",
				surface: "electron",
				readyHeading: "H",
				mockup: null,
			},
			{
				id: "d.web",
				surface: "web",
				route: "/",
				viewport: { width: 1, height: 2 },
				readyHeading: "H",
				mockup: null,
			},
		];
		const conflict = (ids: string[]) =>
			parseArgs(
				["--out", "out/x", ...ids.flatMap((id) => ["--screen", id])],
				twoIos,
				fakeFs().fs,
				root,
			).iosConflict;
		expect(conflict(["a.ios", "b.ios"])).toBe(true);
		expect(conflict(["a.ios", "d.web"])).toBe(false);
		expect(conflict([])).toBe(true);
	});

	it("C4 builds the web app with the gallery only when a gallery screen is selected", () => {
		const needs = (...ids: string[]) =>
			needsGalleryBuild(
				parseArgs(
					["--out", "out/x", ...ids.flatMap((id) => ["--screen", id])],
					realScreens,
					fakeFs().fs,
					root,
				).screens,
			);
		expect(needs("shell.web-390")).toBe(false);
		expect(needs("shell.electron")).toBe(false);
		expect(needs("gallery.web-390")).toBe(true);
		expect(needs("gallery.electron")).toBe(true);
		expect(needs("shell.web-390", "gallery.ios")).toBe(false);
	});
});

describe("manifest", () => {
	it("C3 manifest has the shell and gallery screens with unique ids and the agreed viewports", () => {
		expect(realScreens.map((s) => s.id)).toEqual([
			"shell.web-390",
			"shell.web-1440",
			"shell.electron",
			"shell.ios",
			"gallery.web-390",
			"gallery.web-1440",
			"gallery.electron",
			"gallery.ios",
		]);
		expect(new Set(realScreens.map((s) => s.id)).size).toBe(8);
		const viewports = realScreens.flatMap((s) =>
			s.surface === "web" ? [s.viewport] : [],
		);
		expect(viewports).toEqual([
			{ width: 390, height: 844 },
			{ width: 1440, height: 900 },
			{ width: 390, height: 844 },
			{ width: 1440, height: 900 },
		]);
		const pages = realScreens.flatMap((s) => {
			if (s.surface === "web") return [[s.id, s.route, s.readyHeading]];
			if (s.surface === "electron") return [[s.id, s.hash, s.readyHeading]];
			return [];
		});
		expect(pages).toEqual([
			["shell.web-390", "/", "WAW Tasks"],
			["shell.web-1440", "/", "WAW Tasks"],
			["shell.electron", undefined, "WAW Tasks"],
			["gallery.web-390", "/#/gallery", "Component gallery"],
			["gallery.web-1440", "/#/gallery", "Component gallery"],
			["gallery.electron", "#/gallery", "Component gallery"],
		]);
		expect(realScreens.every((s) => s.mockup === null)).toBe(true);
	});
});
