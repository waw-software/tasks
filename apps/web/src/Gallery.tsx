import { type LabelColor, type ProjectColor, theme } from "@waw/design-tokens";
import { useState } from "react";
import { Banner } from "./ui/Banner.tsx";
import { Button } from "./ui/Button.tsx";
import { Checkbox } from "./ui/Checkbox.tsx";
import { ColorSwatchPicker } from "./ui/ColorSwatchPicker.tsx";
import { GroupHeader } from "./ui/GroupHeader.tsx";
import { LabelChip } from "./ui/LabelChip.tsx";
import { type ListOption, OptionList } from "./ui/OptionList.tsx";
import { ProgressBar } from "./ui/ProgressBar.tsx";
import { ProjectMarker } from "./ui/ProjectMarker.tsx";
import { SegmentedChoice } from "./ui/SegmentedChoice.tsx";
import { Sidebar, type SidebarProps } from "./ui/Sidebar.tsx";
import { TabBar, type TabId } from "./ui/TabBar.tsx";
import { TaskRow, type TaskRowProps } from "./ui/TaskRow.tsx";
import { TextInput } from "./ui/TextInput.tsx";
import { useViewportBelow } from "./ui/useViewportBelow.ts";

export type GallerySection =
	| "components"
	| "rows"
	| "controls"
	| "pickers"
	| "navigation";

const projects: readonly { name: string; color: ProjectColor }[] = [
	{ name: "Home", color: "red" },
	{ name: "Work", color: "blue" },
	{ name: "Personal", color: "green" },
	{ name: "Errands", color: "amber" },
	{ name: "Reading", color: "violet" },
	{ name: "Archive", color: "black" },
];

const labels: readonly { name: string; color: LabelColor }[] = [
	{ name: "@money", color: "green" },
	{ name: "@calls", color: "blue" },
	{ name: "@waiting", color: "amber" },
	{ name: "@errands", color: "violet" },
];

type RowFixture = Omit<TaskRowProps, "onCheckedChange">;

const taskRows: readonly RowFixture[] = [
	{
		title: "Pay rent",
		checked: false,
		priority: 1,
		scheduleText: "09:00 · repeats monthly",
		labels: [
			{ name: "@money", color: "green" },
			{ name: "@waiting", color: "amber" },
		],
		project: { name: "Home", color: "red" },
	},
	{
		title: "Review the pull request",
		checked: false,
		priority: 2,
		selected: true,
		project: { name: "Work", color: "blue" },
	},
	{
		title: "Buy milk",
		checked: true,
		priority: 4,
		scheduleText: "17:00",
		labels: [{ name: "@errands", color: "violet" }],
		project: { name: "Home", color: "red" },
	},
	{
		title: "Pick up the dry cleaning",
		checked: false,
		priority: 3,
		pendingSync: true,
		subtasks: { done: 1, total: 3 },
		labels: [{ name: "@waiting", color: "amber" }],
		project: { name: "Personal", color: "green" },
	},
	{
		title:
			"Call the landlord about the broken heating in the bathroom before the weekend",
		checked: false,
		priority: 2,
		scheduleText: "Tomorrow · 18:30",
		labels: [
			{ name: "@calls", color: "blue" },
			{ name: "@waiting", color: "amber" },
			{ name: "@waiting-for-the-building-management-company", color: "violet" },
		],
		project: {
			name: "Apartment renovation and kitchen repairs before the winter holidays",
			color: "amber",
		},
	},
];

const priorityOptions = ([1, 2, 3, 4] as const).map((priority) => ({
	value: priority,
	label: `P${priority}`,
	priority,
}));

const labelOptions: readonly ListOption<string>[] = [
	{ value: "money", label: "@money", labelColor: "green", detail: "6 tasks" },
	{ value: "calls", label: "@calls", labelColor: "blue", detail: "3 tasks" },
	{
		value: "waiting",
		label: "@waiting",
		labelColor: "amber",
		detail: "2 tasks",
	},
	{
		value: "errands",
		label: "@errands",
		labelColor: "violet",
		detail: "4 tasks",
	},
];

const repeatOptions: readonly ListOption<string>[] = [
	{ value: "never", label: "Never" },
	{ value: "daily", label: "Every day" },
	{ value: "weekly", label: "Every week on Sunday" },
	{ value: "monthly", label: "Every month on the 1st" },
	{ value: "custom", label: "Custom" },
];

const reminderOptions: readonly ListOption<string>[] = [
	{ value: "at-time", label: "At the time of the task" },
	{ value: "ten-minutes", label: "10 minutes before" },
	{ value: "day-before", label: "1 day before" },
];

const specificReminder: ListOption<string> = {
	value: "at-10",
	label: "At 10:00",
};

const navigationHref = "#/gallery/navigation";

const sidebarViews: SidebarProps["views"] = [
	{ id: "inbox", label: "Inbox", href: navigationHref, count: 3 },
	{ id: "today", label: "Today", href: navigationHref, count: 5 },
	{ id: "upcoming", label: "Upcoming", href: navigationHref },
];

const sidebarProjects: SidebarProps["projects"] = [
	{ id: "home", label: "Home", href: navigationHref, count: 5, color: "red" },
	{ id: "work", label: "Work", href: navigationHref, count: 9, color: "blue" },
	{
		id: "personal",
		label: "Personal",
		href: navigationHref,
		count: 4,
		color: "green",
	},
];

const sidebarLabels: SidebarProps["labels"] = labels.map(({ name, color }) => ({
	id: name,
	label: name,
	href: navigationHref,
	color,
}));

const sidebarFilters: SidebarProps["filters"] = [
	{ id: "priority-1", label: "Priority 1", href: navigationHref, count: 3 },
	{
		id: "week-at-work",
		label: "This week at work",
		href: navigationHref,
		count: 5,
	},
];

const sidebarDestinations = [
	...sidebarViews,
	...sidebarProjects,
	...sidebarLabels,
	...sidebarFilters,
];

const tabHeadings: Record<TabId, string> = {
	today: "Today",
	upcoming: "Upcoming",
	search: "Search",
	browse: "Browse",
};

const tabSamples: Partial<Record<TabId, readonly string[]>> = {
	today: [
		"Sun 22 Nov · 5 tasks left",
		"2 of 7 done",
		"Send the invoice to the client",
		"Pay rent",
		"Review the pull request",
	],
	browse: ["Inbox", "home-server · synced"],
};

const bodyFont = `${theme.font.body}, system-ui, sans-serif`;
const headingFont = `"${theme.font.heading}", system-ui, sans-serif`;

const row = { display: "flex", flexWrap: "wrap", gap: 8 } as const;

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section
			aria-label={title}
			style={{ display: "flex", flexDirection: "column", gap: 8 }}
		>
			<p
				style={{
					margin: 0,
					fontSize: theme.type.meta,
					color: theme.color.muted,
				}}
			>
				{title}
			</p>
			{children}
		</section>
	);
}

function GalleryLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return (
		<a
			href={href}
			style={{
				display: "inline-flex",
				alignSelf: "flex-start",
				alignItems: "center",
				minHeight: theme.size.touchTarget,
				fontSize: theme.type.bodyMin,
				color: theme.color["accent-text"],
			}}
		>
			{children}
		</a>
	);
}

function Page({ children }: { children: React.ReactNode }) {
	return (
		<main
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 20,
				maxWidth: 720,
				padding: 20,
				background: theme.color.bg,
				color: theme.color.ink,
				fontFamily: bodyFont,
			}}
		>
			{children}
		</main>
	);
}

function Title({ children }: { children: React.ReactNode }) {
	return (
		<h1
			style={{
				margin: 0,
				fontFamily: headingFont,
				fontSize: theme.type.screen,
				fontWeight: theme.font.semibold,
			}}
		>
			{children}
		</h1>
	);
}

function NavigationContent({
	destination,
	addPressed,
	lines = [],
	style,
}: {
	destination: string;
	addPressed: boolean;
	lines?: readonly string[];
	style?: React.CSSProperties;
}) {
	return (
		<main
			style={{
				boxSizing: "border-box",
				display: "flex",
				flexDirection: "column",
				gap: 8,
				padding: 20,
				background: theme.color.bg,
				color: theme.color.ink,
				fontFamily: bodyFont,
				fontSize: theme.type.bodyMin,
				...style,
			}}
		>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<GalleryLink href="#/gallery">Back</GalleryLink>
				<Title>Navigation</Title>
			</div>
			<h2 style={{ margin: 0, fontFamily: headingFont }}>{destination}</h2>
			{lines.map((line) => (
				<p key={line} style={{ margin: 0 }}>
					{line}
				</p>
			))}
			{addPressed ? <p style={{ margin: 0 }}>Selected: Add task</p> : null}
		</main>
	);
}

// The page takes the full width: the sidebar and the tab bar belong to its edges.
function NavigationPage() {
	const narrow = useViewportBelow(theme.size.sidebarFrom);
	const [tab, setTab] = useState<TabId>("today");
	const [activeId, setActiveId] = useState("today");
	const [addPressed, setAddPressed] = useState(false);
	const add = () => setAddPressed(true);

	if (narrow) {
		const safeBottom = `max(env(safe-area-inset-bottom, 0px), ${theme.space.navigationBottom}px)`;
		// The height of the dock with the add button, so that it hides no content.
		const dockHeight =
			theme.size.fab +
			theme.space.fabAboveTab +
			theme.size.controlBorder +
			theme.space.tabTop +
			theme.size.tab;
		return (
			<>
				<NavigationContent
					destination={tabHeadings[tab]}
					addPressed={addPressed}
					lines={tabSamples[tab] ?? []}
					style={{ paddingBottom: `calc(${dockHeight}px + ${safeBottom})` }}
				/>
				<div
					style={{
						position: "fixed",
						right: 0,
						bottom: 0,
						left: 0,
						// The room beside the add button must not block the content.
						pointerEvents: "none",
					}}
				>
					<TabBar
						activeTab={tab}
						onTabChange={setTab}
						{...(tab === "today" ? { onAdd: add } : {})}
					/>
					<div
						style={{
							height: safeBottom,
							background: theme.color.bg,
							pointerEvents: "auto",
						}}
					/>
				</div>
			</>
		);
	}

	return (
		<div style={{ display: "flex", height: "100vh" }}>
			<Sidebar
				views={sidebarViews}
				projects={sidebarProjects}
				labels={sidebarLabels}
				filters={sidebarFilters}
				activeId={activeId}
				serverStatus={{ label: "home-server · synced", tone: "synced" }}
				onAdd={add}
				onNavigate={setActiveId}
			/>
			<NavigationContent
				destination={
					sidebarDestinations.find(({ id }) => id === activeId)?.label ?? ""
				}
				addPressed={addPressed}
				style={{ flex: 1, minWidth: 0, overflowY: "auto" }}
			/>
		</div>
	);
}

function CheckboxExample({
	label,
	initialChecked,
}: {
	label: string;
	initialChecked: boolean;
}) {
	const [checked, setChecked] = useState(initialChecked);
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				fontSize: theme.type.bodyMin,
			}}
		>
			<Checkbox checked={checked} label={label} onCheckedChange={setChecked} />
			<span>{label}</span>
		</span>
	);
}

function TaskRowExample({ fixture }: { fixture: RowFixture }) {
	const [checked, setChecked] = useState(fixture.checked);
	return (
		<TaskRow {...fixture} checked={checked} onCheckedChange={setChecked} />
	);
}

function RowsPage() {
	return (
		<Page>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<GalleryLink href="#/gallery">Back</GalleryLink>
				<Title>Task row gallery</Title>
			</div>
			<Section title="Checkbox">
				<div style={{ ...row, columnGap: 20 }}>
					<CheckboxExample label="Unchecked example" initialChecked={false} />
					<CheckboxExample label="Checked example" initialChecked />
				</div>
			</Section>
			<Section title="Task rows">
				<div style={{ maxWidth: 720 }}>
					{taskRows.map((fixture) => (
						<TaskRowExample key={fixture.title} fixture={fixture} />
					))}
				</div>
			</Section>
		</Page>
	);
}

function ControlsPage() {
	const [address, setAddress] = useState("https://tasks.example.com");
	const [token, setToken] = useState("example-only");
	const [tokenEdited, setTokenEdited] = useState(false);
	const [selected, setSelected] = useState("none");

	const action = (label: string) => ({
		label,
		onPress: () => setSelected(label),
	});

	return (
		<Page>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<GalleryLink href="#/gallery">Back</GalleryLink>
				<Title>Controls</Title>
			</div>
			<Section title="Text inputs">
				<TextInput
					label="Server address"
					kind="url"
					value={address}
					onValueChange={setAddress}
					helperText="Enter its address to continue."
				/>
				<TextInput
					label="Access token"
					kind="token"
					value={token}
					onValueChange={(value) => {
						setToken(value);
						setTokenEdited(true);
					}}
					{...(tokenEdited ? {} : { errorText: "Enter a valid access token." })}
				/>
			</Section>
			<Section title="Banners">
				<Banner
					tone="warning"
					title="Working offline"
					message="3 changes are saved on this computer and will sync when the server is reachable."
					action={action("Retry")}
				/>
				<Banner
					tone="update"
					title="Your server needs an update"
					message="It runs API v1, this app supports v2. Newer features stay off until you update."
					action={action("How to update")}
				/>
				<Banner tone="success" title="Server reachable · API v1" />
			</Section>
			<Section title="Buttons">
				<Button variant="primary" fullWidth {...action("Connect")} />
				<Button
					variant="secondary"
					fullWidth
					{...action("Continue with limited features")}
				/>
				<div style={{ ...row, alignItems: "center" }}>
					<Button variant="text" {...action("How to deploy with Docker")} />
					<Button
						variant="primary"
						size="compact"
						disabled
						{...action("Check again")}
					/>
				</div>
			</Section>
			<p style={{ margin: 0, fontSize: theme.type.bodyMin }}>
				Selected: {selected}
			</p>
		</Page>
	);
}

function PickersPage() {
	const [priority, setPriority] = useState<1 | 2 | 3 | 4>(1);
	const [chosenLabels, setChosenLabels] = useState(["money"]);
	const [newLabelPressed, setNewLabelPressed] = useState(false);
	const [projectColor, setProjectColor] = useState<ProjectColor>("red");
	const [labelColor, setLabelColor] = useState<LabelColor>("green");
	const [repeat, setRepeat] = useState("monthly");
	const [reminders, setReminders] = useState(["at-time", "day-before"]);
	const [hasSpecificReminder, setHasSpecificReminder] = useState(false);

	const addSpecificReminder = () => {
		setHasSpecificReminder(true);
		setReminders((current) =>
			current.includes(specificReminder.value)
				? current
				: [...current, specificReminder.value],
		);
	};

	return (
		<Page>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<GalleryLink href="#/gallery">Back</GalleryLink>
				<Title>Pickers</Title>
			</div>
			<Section title="Priority">
				<SegmentedChoice
					label="Priority"
					options={priorityOptions}
					value={priority}
					onValueChange={setPriority}
					helperText="P1 tasks rise to the top of Today. P4 is the default."
				/>
			</Section>
			<Section title="Labels">
				<OptionList
					mode="multiple"
					label="Labels"
					options={labelOptions}
					value={chosenLabels}
					onValueChange={setChosenLabels}
					action={{
						label: "New label",
						onPress: () => setNewLabelPressed(true),
					}}
				/>
				{newLabelPressed ? (
					<p style={{ margin: 0, fontSize: theme.type.bodyMin }}>
						Selected: New label
					</p>
				) : null}
			</Section>
			<Section title="Project colour">
				<ColorSwatchPicker
					palette="project"
					label="Color"
					value={projectColor}
					onValueChange={setProjectColor}
				/>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						fontSize: theme.type.bodyMin,
					}}
				>
					<ProjectMarker color={projectColor} />
					<span>Home</span>
					<span style={{ fontSize: theme.type.meta, color: theme.color.muted }}>
						5 tasks
					</span>
				</div>
			</Section>
			<Section title="Label colour">
				<ColorSwatchPicker
					palette="label"
					label="Label color"
					value={labelColor}
					onValueChange={setLabelColor}
				/>
				<div style={row}>
					<LabelChip name="@money" color={labelColor} />
				</div>
			</Section>
			<Section title="Repeat">
				<OptionList
					mode="single"
					label="Repeat"
					options={repeatOptions}
					value={repeat}
					onValueChange={setRepeat}
					helperText="Next one appears after you complete this one: Tue 1 Dec, 09:00."
				/>
			</Section>
			<Section title="Reminders">
				<OptionList
					mode="multiple"
					label="Reminders"
					options={
						hasSpecificReminder
							? [...reminderOptions, specificReminder]
							: reminderOptions
					}
					value={reminders}
					onValueChange={setReminders}
					action={{ label: "At a specific time", onPress: addSpecificReminder }}
				/>
			</Section>
		</Page>
	);
}

function ComponentsPage() {
	return (
		<Page>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<Title>Component gallery</Title>
				<GalleryLink href="#/gallery/rows">Task rows</GalleryLink>
				<GalleryLink href="#/gallery/controls">Controls</GalleryLink>
				<GalleryLink href="#/gallery/pickers">Pickers</GalleryLink>
				<GalleryLink href={navigationHref}>Navigation</GalleryLink>
			</div>
			<Section title="Project markers">
				<div style={{ ...row, columnGap: 20 }}>
					{projects.map(({ name, color }) => (
						<span
							key={color}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 8,
								fontSize: theme.type.bodyMin,
							}}
						>
							<ProjectMarker color={color} />
							<span>{name}</span>
						</span>
					))}
				</div>
			</Section>
			<Section title="Label chips">
				<div style={{ ...row, background: theme.color.bg }}>
					{labels.map(({ name, color }) => (
						<LabelChip key={name} name={name} color={color} />
					))}
				</div>
				<div
					style={{
						...row,
						padding: 12,
						borderRadius: theme.radius.card,
						background: theme.color.surface,
					}}
				>
					{labels.map(({ name, color }) => (
						<LabelChip key={name} name={name} color={color} on="surface" />
					))}
				</div>
			</Section>
			<Section title="Group headers">
				<GroupHeader label="Overdue" count={1} tone="overdue" />
				<GroupHeader label="Today" count={3} />
				<GroupHeader label="Today" count={0} />
				<GroupHeader label="Someday" />
			</Section>
			<Section title="Progress">
				<ProgressBar done={0} total={7} />
				<ProgressBar done={2} total={7} />
				<ProgressBar done={7} total={7} />
				<p
					style={{
						margin: 0,
						fontSize: theme.type.meta,
						color: theme.color.muted,
					}}
				>
					0 of 0: hidden
				</p>
				<ProgressBar done={0} total={0} />
			</Section>
		</Page>
	);
}

export default function Gallery({
	section = "components",
}: {
	section?: GallerySection;
}): React.JSX.Element {
	if (section === "rows") return <RowsPage />;
	if (section === "controls") return <ControlsPage />;
	if (section === "pickers") return <PickersPage />;
	if (section === "navigation") return <NavigationPage />;
	return <ComponentsPage />;
}
