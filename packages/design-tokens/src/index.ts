export type ProjectColor =
	| "red"
	| "blue"
	| "green"
	| "amber"
	| "violet"
	| "black";
export type LabelColor = "green" | "blue" | "amber" | "violet";
export type Priority = 1 | 2 | 3 | 4;

type ColorKey =
	| "bg"
	| "surface"
	| "ink"
	| "ink-2"
	| "muted"
	| "border"
	| "border-strong"
	| "divider"
	| "accent"
	| "accent-text"
	| "accent-dark"
	| "accent-tint"
	| "success"
	| "success-text"
	| "success-tint"
	| "warning"
	| "warning-on-surface"
	| "warning-tint";

type LabelColors = Readonly<{
	bg: string;
	ink: string;
	surfaceBg: string;
	surfaceInk: string;
}>;

export const theme = {
	color: {
		bg: "#FFFFFF",
		surface: "#F6F5F2",
		ink: "#171717",
		"ink-2": "#3D3D3D",
		muted: "#5C5C5C",
		border: "#E4E2DD",
		"border-strong": "#D9D6D0",
		divider: "#EEECE8",
		accent: "#D4213D",
		"accent-text": "#B01A31",
		"accent-dark": "#8C1427",
		"accent-tint": "#FCEBEE",
		success: "#1F7A4D",
		"success-text": "#1B6943",
		"success-tint": "#EEF6F1",
		warning: "#8A5A00",
		"warning-on-surface": "#7A4F00",
		"warning-tint": "#FBF3E2",
	},
	priority: {
		1: "#B01A31",
		2: "#8A5A00",
		3: "#1F5FBF",
		4: "#5C5C5C",
	},
	project: {
		red: "#D4213D",
		blue: "#1F5FBF",
		green: "#1F7A4D",
		amber: "#8A5A00",
		violet: "#5B3FB5",
		black: "#171717",
	},
	label: {
		green: {
			bg: "#EEF6F1",
			ink: "#1B6943",
			surfaceBg: "#E2F0E8",
			surfaceInk: "#1B6943",
		},
		blue: {
			bg: "#EAF1FB",
			ink: "#1F5FBF",
			surfaceBg: "#DCE8F8",
			surfaceInk: "#1F5FBF",
		},
		amber: {
			bg: "#FBF3E2",
			ink: "#8A5A00",
			surfaceBg: "#F6E9CC",
			surfaceInk: "#7A4F00",
		},
		violet: {
			bg: "#F0ECFA",
			ink: "#5B3FB5",
			surfaceBg: "#E6DFF7",
			surfaceInk: "#5B3FB5",
		},
	},
	font: {
		body: "Inter",
		heading: "Space Grotesk",
		mono: "monospace",
		regular: 400,
		medium: 500,
		semibold: 600,
	},
	type: {
		screen: 30,
		sectionMin: 22,
		sectionMax: 26,
		bodyMin: 15,
		bodyMax: 16,
		meta: 13,
		group: 12,
		groupLetterSpacing: 0.4,
		tab: 11,
		chip: 13,
	},
	radius: {
		chip: 6,
		nav: 10,
		input: 12,
		button: 12,
		card: 14,
		primary: 14,
		overlayMin: 16,
		overlayMax: 18,
		pill: 999,
		projectMarker: 3,
	},
	space: {
		mainBlock: 32,
		mainInline: 36,
		chipBlock: 2,
		chipInline: 8,
	},
	size: {
		touchTarget: 44,
		mobileInputMin: 50,
		mobileInputMax: 52,
		mobilePrimary: 54,
		fab: 56,
		tab: 52,
		phoneWidth: 390,
		phoneHeight: 844,
		desktopWidth: 1440,
		sidebar: 248,
		detailMin: 340,
		detailMax: 440,
		projectMarker: 8,
		checkbox: 22,
		progress: 6,
	},
} as const satisfies Readonly<Record<string, unknown>> & {
	color: Readonly<Record<ColorKey, string>>;
	priority: Readonly<Record<Priority, string>>;
	project: Readonly<Record<ProjectColor, string>>;
	label: Readonly<Record<LabelColor, LabelColors>>;
};
