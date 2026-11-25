import { type LabelColor, type ProjectColor, theme } from "@waw/design-tokens";
import { useState } from "react";
import { Checkbox } from "./ui/Checkbox.tsx";
import { GroupHeader } from "./ui/GroupHeader.tsx";
import { LabelChip } from "./ui/LabelChip.tsx";
import { ProgressBar } from "./ui/ProgressBar.tsx";
import { ProjectMarker } from "./ui/ProjectMarker.tsx";
import { TaskRow, type TaskRowProps } from "./ui/TaskRow.tsx";

export type GallerySection = "components" | "rows";

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

function ComponentsPage() {
	return (
		<Page>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<Title>Component gallery</Title>
				<GalleryLink href="#/gallery/rows">Task rows</GalleryLink>
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
	return section === "rows" ? <RowsPage /> : <ComponentsPage />;
}
