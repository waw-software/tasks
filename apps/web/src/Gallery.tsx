import { type LabelColor, type ProjectColor, theme } from "@waw/design-tokens";
import { GroupHeader } from "./ui/GroupHeader.tsx";
import { LabelChip } from "./ui/LabelChip.tsx";
import { ProgressBar } from "./ui/ProgressBar.tsx";
import { ProjectMarker } from "./ui/ProjectMarker.tsx";

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

export default function Gallery(): React.JSX.Element {
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
			<h1
				style={{
					margin: 0,
					fontFamily: headingFont,
					fontSize: theme.type.screen,
					fontWeight: theme.font.semibold,
				}}
			>
				Component gallery
			</h1>
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
		</main>
	);
}
