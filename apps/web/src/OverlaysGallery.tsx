import { theme } from "@waw/design-tokens";
import { useRef, useState } from "react";
import { Button } from "./ui/Button.tsx";
import { DetailPanel } from "./ui/DetailPanel.tsx";
import { Dialog } from "./ui/Dialog.tsx";
import { LabelChip } from "./ui/LabelChip.tsx";
import { ProjectMarker } from "./ui/ProjectMarker.tsx";
import { Sheet } from "./ui/Sheet.tsx";
import { TaskRow, type TaskRowProps } from "./ui/TaskRow.tsx";
import { TextInput } from "./ui/TextInput.tsx";
import { useViewportBelow } from "./ui/useViewportBelow.ts";

// The width from which the detail panel sits beside the list (DESIGN §3).
const panelFrom = 1100;

type RowFixture = Omit<TaskRowProps, "checked" | "onCheckedChange">;

const todayRows: readonly RowFixture[] = [
	{
		title: "Pay rent",
		priority: 1,
		scheduleText: "09:00 · repeats monthly",
		labels: [{ name: "@money", color: "green" }],
		project: { name: "Home", color: "red" },
	},
	{
		title: "Review the pull request",
		priority: 2,
		project: { name: "Work", color: "blue" },
	},
	{ title: "Buy milk", priority: 4, scheduleText: "17:00" },
];

const detailFields: readonly { name: string; value: React.ReactNode }[] = [
	{ name: "Due", value: "Mon 1 Dec · 09:00" },
	{ name: "Priority", value: "P1" },
	{ name: "Labels", value: <LabelChip name="@money" color="green" /> },
	{ name: "Reminder", value: "1 day before" },
];

const subtasks = [
	{ title: "Check the amount", done: true },
	{ title: "Make the transfer", done: false },
	{ title: "Save the confirmation", done: false },
];

const chipStyle: React.CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	gap: theme.space.taskRowProjectGap,
	padding: `${theme.space.bannerGap}px ${theme.space.bannerBlock}px`,
	borderRadius: theme.radius.nav,
	background: theme.color.surface,
	fontSize: theme.type.controlSupport,
};

const understoodParts: readonly {
	id: string;
	content: React.ReactNode;
	style?: React.CSSProperties;
}[] = [
	{ id: "repeat", content: "Every month on the 1st" },
	{ id: "time", content: "09:00" },
	{
		id: "priority",
		content: "Priority 1",
		style: {
			background: theme.color["accent-tint"],
			color: theme.color["accent-dark"],
			fontWeight: theme.font.semibold,
		},
	},
	{
		id: "project",
		content: (
			<>
				<ProjectMarker color="red" />
				<span>Home</span>
			</>
		),
	},
	{
		id: "label",
		content: <LabelChip name="@money" color="green" />,
		// The label chip brings its own surface.
		style: { padding: 0, background: "transparent" },
	},
];

const metaStyle: React.CSSProperties = {
	margin: 0,
	fontSize: theme.type.meta,
	color: theme.color.muted,
};

const groupStyle: React.CSSProperties = {
	...metaStyle,
	fontSize: theme.type.group,
	fontWeight: theme.font.semibold,
	letterSpacing: theme.type.groupLetterSpacing,
};

const headingFont = `"${theme.font.heading}", system-ui, sans-serif`;

const listStyle: React.CSSProperties = {
	margin: 0,
	padding: 0,
	listStyle: "none",
};

function SampleRow({ fixture }: { fixture: RowFixture }) {
	const [checked, setChecked] = useState(false);
	return (
		<TaskRow {...fixture} checked={checked} onCheckedChange={setChecked} />
	);
}

function PayRentDetails() {
	return (
		<>
			<p style={metaStyle}>Home / Bills</p>
			<p style={{ margin: 0, fontSize: theme.type.bodyMin }}>
				Transfer to the landlord by the 1st.
			</p>
			<dl
				style={{
					display: "grid",
					gridTemplateColumns: "auto 1fr",
					alignItems: "center",
					gap: theme.space.optionGap,
					margin: 0,
					fontSize: theme.type.bodyMin,
				}}
			>
				{detailFields.map(({ name, value }) => (
					<div key={name} style={{ display: "contents" }}>
						<dt style={{ color: theme.color.muted }}>{name}</dt>
						<dd style={{ margin: 0 }}>{value}</dd>
					</div>
				))}
			</dl>
			<p style={groupStyle}>SUBTASKS · 1 OF 3</p>
			<ul style={{ ...listStyle, fontSize: theme.type.bodyMin }}>
				{subtasks.map(({ title, done }) => (
					<li
						key={title}
						style={{
							display: "flex",
							gap: theme.space.bannerGap,
							padding: `${theme.space.bannerGap}px 0`,
							color: done ? theme.color.muted : theme.color.ink,
						}}
					>
						<span style={{ textDecoration: done ? "line-through" : "none" }}>
							{title}
						</span>
						{done ? (
							<span role="img" aria-label="Done">
								✓
							</span>
						) : null}
					</li>
				))}
			</ul>
			<p style={{ ...metaStyle, marginTop: "auto" }}>
				Repeats monthly · next on Tue 1 Dec
			</p>
		</>
	);
}

export default function OverlaysGallery({
	quickAddOpen = false,
}: {
	quickAddOpen?: boolean;
}): React.JSX.Element {
	const phone = useViewportBelow(theme.size.sidebarFrom);
	const wide = !useViewportBelow(panelFrom);
	const [panelOpen, setPanelOpen] = useState(true);
	const [open, setOpen] = useState(quickAddOpen);
	const [text, setText] = useState(
		"Pay rent every 1st at 9:00 p1 #Home @money",
	);
	const [added, setAdded] = useState(false);
	const launcherRef = useRef<HTMLDivElement>(null);

	const close = () => setOpen(false);
	// A page mounted open has no launcher to return to, and not every browser
	// focuses a button on click.
	const focusLauncher = () => {
		if (document.activeElement !== document.body) return;
		launcherRef.current?.querySelector("button")?.focus();
	};
	const QuickAdd = phone ? Sheet : Dialog;

	return (
		<div
			style={{
				display: "flex",
				minHeight: "100vh",
				background: theme.color.bg,
				color: theme.color.ink,
				fontFamily: `${theme.font.body}, system-ui, sans-serif`,
			}}
		>
			<main
				style={{
					boxSizing: "border-box",
					display: "flex",
					flex: 1,
					flexDirection: "column",
					alignItems: "flex-start",
					gap: theme.space.overlayGap,
					minWidth: 0,
					padding: theme.space.sheetPadding,
				}}
			>
				<div style={{ display: "flex", flexDirection: "column" }}>
					<a
						href="#/gallery"
						style={{
							display: "inline-flex",
							alignSelf: "flex-start",
							alignItems: "center",
							minHeight: theme.size.touchTarget,
							fontSize: theme.type.bodyMin,
							color: theme.color["accent-text"],
						}}
					>
						Back
					</a>
					<h1
						style={{
							margin: 0,
							fontFamily: headingFont,
							fontSize: theme.type.screen,
							fontWeight: theme.font.semibold,
						}}
					>
						Overlays
					</h1>
				</div>
				<section style={{ alignSelf: "stretch", maxWidth: 720 }}>
					<h2
						style={{
							margin: 0,
							fontFamily: headingFont,
							fontSize: theme.type.sectionMin,
							fontWeight: theme.font.semibold,
						}}
					>
						Today
					</h2>
					{todayRows.map((fixture) => (
						<SampleRow key={fixture.title} fixture={fixture} />
					))}
				</section>
				<div ref={launcherRef}>
					<Button
						variant="primary"
						label="Quick add"
						onPress={() => {
							setAdded(false);
							setOpen(true);
						}}
					/>
				</div>
				{wide && !panelOpen ? (
					<Button
						variant="secondary"
						label="Open details"
						onPress={() => setPanelOpen(true)}
					/>
				) : null}
				{added ? (
					<p style={{ margin: 0, fontSize: theme.type.bodyMin }}>
						Selected: Add task
					</p>
				) : null}
			</main>
			{wide && panelOpen ? (
				<DetailPanel title="Pay rent" onClose={() => setPanelOpen(false)}>
					<PayRentDetails />
				</DetailPanel>
			) : null}
			<QuickAdd
				open={open}
				title="New task"
				onDismiss={close}
				onAfterClose={focusLauncher}
				dismissOnBackdrop={false}
				footer={
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							justifyContent: "flex-end",
							gap: theme.space.swatchGap,
						}}
					>
						<Button variant="secondary" label="Cancel" onPress={close} />
						<Button
							variant="primary"
							size="compact"
							label="Add task"
							onPress={() => {
								setAdded(true);
								close();
							}}
						/>
					</div>
				}
			>
				<TextInput label="Task" value={text} onValueChange={setText} />
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: theme.space.bannerGap,
					}}
				>
					<p style={groupStyle}>Understood as</p>
					<ul
						aria-label="Understood as"
						style={{
							...listStyle,
							display: "flex",
							flexWrap: "wrap",
							gap: theme.space.bannerGap,
						}}
					>
						{understoodParts.map(({ id, content, style }) => (
							<li key={id} style={{ ...chipStyle, ...style }}>
								{content}
							</li>
						))}
					</ul>
				</div>
				<p style={metaStyle}>
					Type it the way you say it: dates, p1 to p4, #project, @label.
				</p>
			</QuickAdd>
		</div>
	);
}
