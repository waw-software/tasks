type Base = { id: string; mockup: string | null }; // mockup: repo-relative PNG path

export type Screen =
	| (Base & {
			surface: "web";
			route: string;
			viewport: { width: number; height: number };
			readyHeading: string;
	  })
	| (Base & { surface: "electron"; readyHeading: string; hash?: string })
	| (Base & { surface: "ios" });

// A later milestone adds a screen here: id `<screen>.<surface>`, the route (web) or launch
// step (electron, ios), the viewport (web) and the mockup PNG under `docs/design/screens/`.
export const screens: readonly Screen[] = [
	{
		id: "shell.web-390",
		surface: "web",
		route: "/",
		viewport: { width: 390, height: 844 },
		readyHeading: "WAW Tasks",
		mockup: null,
	},
	{
		id: "shell.web-1440",
		surface: "web",
		route: "/",
		viewport: { width: 1440, height: 900 },
		readyHeading: "WAW Tasks",
		mockup: null,
	},
	{
		id: "shell.electron",
		surface: "electron",
		readyHeading: "WAW Tasks",
		mockup: null,
	},
	{ id: "shell.ios", surface: "ios", mockup: null },
	{
		id: "gallery.web-390",
		surface: "web",
		route: "/#/gallery",
		viewport: { width: 390, height: 844 },
		readyHeading: "Component gallery",
		mockup: null,
	},
	{
		id: "gallery.web-1440",
		surface: "web",
		route: "/#/gallery",
		viewport: { width: 1440, height: 900 },
		readyHeading: "Component gallery",
		mockup: null,
	},
	{
		id: "gallery.electron",
		surface: "electron",
		hash: "#/gallery",
		readyHeading: "Component gallery",
		mockup: null,
	},
	{ id: "gallery.ios", surface: "ios", mockup: null },
];
