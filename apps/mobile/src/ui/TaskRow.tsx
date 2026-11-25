import {
	type LabelColor,
	type Priority,
	type ProjectColor,
	theme,
} from "@waw/design-tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "../fonts";
import { Checkbox } from "./Checkbox";
import { LabelChip } from "./LabelChip";
import { ProjectMarker } from "./ProjectMarker";

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
}: TaskRowProps) {
	const inline = inlineParts(priority, scheduleText, subtasks);
	const hasMeta =
		inline.length > 0 ||
		pendingSync ||
		labels.length > 0 ||
		project !== undefined;

	return (
		<View testID="task-row" style={[styles.row, selected && styles.selected]}>
			<Checkbox
				checked={checked}
				label={title}
				onCheckedChange={onCheckedChange}
			/>
			<View style={styles.content}>
				<Text
					accessibilityState={{ selected }}
					style={[styles.title, checked && styles.titleChecked]}
				>
					{title}
				</Text>
				{hasMeta && (
					<View testID="task-meta" style={styles.meta}>
						{inline.length > 0 && <Text style={styles.metaText}>{inline}</Text>}
						{pendingSync && <Text style={styles.pending}>not synced yet</Text>}
						{labels.map(({ name, color }) => (
							<LabelChip key={name} name={name} color={color} />
						))}
						{project && (
							<View testID="task-project" style={styles.project}>
								<Text style={styles.projectName}>{project.name}</Text>
								<ProjectMarker color={project.color} />
							</View>
						)}
					</View>
				)}
			</View>
		</View>
	);
}

/** The text parts of the meta line, with a separator only between present ones. */
function inlineParts(
	priority: Priority,
	scheduleText: TaskRowProps["scheduleText"],
	subtasks: TaskRowProps["subtasks"],
): ReactNode[] {
	const parts: ReactNode[] = [];
	if (priority !== 4) {
		parts.push(
			<Text
				key="priority"
				style={[styles.priority, { color: theme.priority[priority] }]}
			>
				{`P${priority}`}
			</Text>,
		);
	}
	if (scheduleText) {
		parts.push(scheduleText);
	}
	if (subtasks && subtasks.total > 0) {
		parts.push(`${subtasks.done} of ${subtasks.total} subtasks`);
	}
	return parts.flatMap((part, index) => (index === 0 ? [part] : [" · ", part]));
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "flex-start",
		borderBottomWidth: 1,
		borderBottomColor: theme.color.divider,
	},
	selected: {
		backgroundColor: theme.color["accent-tint"],
	},
	content: {
		flex: 1,
		minWidth: 0,
		paddingVertical: theme.space.taskRowBlock,
		gap: theme.space.taskRowTitleGap,
	},
	title: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.bodyMax,
		lineHeight: theme.type.taskTitleLineHeight,
		color: theme.color.ink,
	},
	titleChecked: {
		color: theme.color.muted,
		textDecorationLine: "line-through",
	},
	meta: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		rowGap: theme.space.taskRowMetaRowGap,
		columnGap: theme.space.taskRowMetaColumnGap,
	},
	metaText: {
		flexShrink: 1,
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
	priority: {
		fontFamily: fontFamilies.bodySemibold,
	},
	pending: {
		fontFamily: fontFamilies.bodySemibold,
		fontSize: theme.type.meta,
		color: theme.color.warning,
	},
	project: {
		flexDirection: "row",
		alignItems: "center",
		flexShrink: 1,
		marginLeft: "auto",
		gap: theme.space.taskRowProjectGap,
	},
	projectName: {
		flexShrink: 1,
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
});
