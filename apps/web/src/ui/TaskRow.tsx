import {
	type LabelColor,
	type Priority,
	type ProjectColor,
	theme,
} from "@waw/design-tokens";
import { useState } from "react";
import { Checkbox } from "./Checkbox.tsx";
import { LabelChip } from "./LabelChip.tsx";
import { ProjectMarker } from "./ProjectMarker.tsx";

export type TaskRowProps = {
	title: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	priority: Priority;
	scheduleText?: string;
	subtasks?: { done: number; total: number };
	labels?: readonly { name: string; color: LabelColor }[];
	project?: { name: string; color: ProjectColor };
	selected?: boolean;
	pendingSync?: boolean;
};

export function TaskRow({
	title,
	checked,
	onCheckedChange,
	priority,
	scheduleText,
	subtasks,
	labels = [],
	project,
	selected = false,
	pendingSync = false,
}: TaskRowProps): React.JSX.Element {
	const [mouseOver, setMouseOver] = useState(false);
	const hovered = mouseOver && !selected;
	const progressText =
		subtasks && subtasks.total > 0
			? `${subtasks.done} of ${subtasks.total} subtasks`
			: undefined;
	const detailText = [scheduleText, progressText].filter(Boolean).join(" · ");
	const showPriority = priority !== 4;
	const showDetails = showPriority || detailText !== "";
	const showMeta =
		showDetails || pendingSync || labels.length > 0 || project !== undefined;

	let background = "transparent";
	if (selected) {
		background = theme.color["accent-tint"];
	} else if (hovered) {
		background = theme.color.surface;
	}

	return (
		<div
			data-part="row"
			aria-current={selected ? "true" : undefined}
			onPointerEnter={(event) => {
				if (event.pointerType === "mouse") {
					setMouseOver(true);
				}
			}}
			onPointerLeave={() => setMouseOver(false)}
			style={{
				display: "flex",
				alignItems: "flex-start",
				borderBottom: `1px solid ${theme.color.divider}`,
				backgroundColor: background,
			}}
		>
			<Checkbox
				checked={checked}
				label={title}
				onCheckedChange={onCheckedChange}
			/>
			<div
				style={{
					display: "flex",
					flex: 1,
					flexDirection: "column",
					minWidth: 0,
					padding: `${theme.space.taskRowBlock}px 0`,
					gap: theme.space.taskRowTitleGap,
				}}
			>
				<span
					style={{
						fontSize: theme.type.bodyMax,
						lineHeight: `${theme.type.taskTitleLineHeight}px`,
						fontWeight: theme.font.regular,
						color: checked ? theme.color.muted : theme.color.ink,
						textDecoration: checked ? "line-through" : "none",
						overflowWrap: "anywhere",
					}}
				>
					{title}
				</span>
				{showMeta ? (
					<div
						data-part="meta"
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							gap: `${theme.space.taskRowMetaRowGap}px ${theme.space.taskRowMetaColumnGap}px`,
							fontSize: theme.type.meta,
							color: theme.color.muted,
							// Inherited, so that a long label chip wraps too.
							overflowWrap: "anywhere",
						}}
					>
						{showDetails ? (
							<span>
								{showPriority ? (
									<span
										style={{
											fontWeight: theme.font.semibold,
											color: theme.priority[priority],
										}}
									>
										P{priority}
									</span>
								) : null}
								{showPriority && detailText !== "" ? " · " : null}
								{detailText}
							</span>
						) : null}
						{pendingSync ? (
							<span
								style={{
									fontWeight: theme.font.semibold,
									color: hovered
										? theme.color["warning-on-surface"]
										: theme.color.warning,
								}}
							>
								not synced yet
							</span>
						) : null}
						{labels.map((label) => (
							<LabelChip
								key={label.name}
								name={label.name}
								color={label.color}
								on={hovered ? "surface" : "bg"}
							/>
						))}
						{project ? (
							<span
								data-part="project"
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: theme.space.taskRowProjectGap,
									minWidth: 0,
									marginLeft: "auto",
									overflowWrap: "anywhere",
								}}
							>
								<span>{project.name}</span>
								<ProjectMarker color={project.color} />
							</span>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
