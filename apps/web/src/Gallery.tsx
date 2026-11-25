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
import { TaskRow, type TaskRowProps } from "./ui/TaskRow.tsx";
import { TextInput } from "./ui/TextInput.tsx";

export type GallerySection = "components" | "rows" | "controls" | "pickers";

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
	return <ComponentsPage />;
}
