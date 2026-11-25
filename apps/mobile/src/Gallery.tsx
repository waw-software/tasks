import { type LabelColor, type ProjectColor, theme } from "@waw/design-tokens";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GroupHeader } from "./ui/GroupHeader";
import { LabelChip, type LabelChipProps } from "./ui/LabelChip";
import { ProgressBar } from "./ui/ProgressBar";
import { ProjectMarker } from "./ui/ProjectMarker";

const projects: readonly { color: ProjectColor; name: string }[] = [
	{ color: "red", name: "Home" },
	{ color: "blue", name: "Work" },
	{ color: "green", name: "Personal" },
	{ color: "amber", name: "Errands" },
	{ color: "violet", name: "Reading" },
	{ color: "black", name: "Archive" },
];

const labels: readonly { color: LabelColor; name: string }[] = [
	{ color: "green", name: "@money" },
	{ color: "blue", name: "@calls" },
	{ color: "amber", name: "@waiting" },
	{ color: "violet", name: "@errands" },
];

export default function Gallery({ onBack }: { onBack: () => void }) {
	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={styles.screen}
			contentContainerStyle={styles.content}
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Back"
				onPress={onBack}
				style={styles.back}
			>
				<Text style={styles.backText}>Back</Text>
			</Pressable>
			<Text accessibilityRole="header" style={styles.title}>
				Component gallery
			</Text>

			<Section caption="Project markers">
				{projects.map(({ color, name }) => (
					<View key={color} style={styles.project}>
						<ProjectMarker color={color} />
						<Text style={styles.projectName}>{name}</Text>
					</View>
				))}
			</Section>

			<Section caption="Label chips">
				<ChipRow on="bg" />
				<View style={styles.surface}>
					<ChipRow on="surface" />
				</View>
			</Section>

			<Section caption="Group headers">
				<GroupHeader label="Overdue" count={1} tone="overdue" />
				<GroupHeader label="Today" count={3} />
				<GroupHeader label="Today" count={0} />
				<GroupHeader label="Someday" />
			</Section>

			<Section caption="Progress">
				<ProgressBar done={0} total={7} />
				<ProgressBar done={2} total={7} />
				<ProgressBar done={7} total={7} />
				<ProgressBar done={0} total={0} />
				<Text style={styles.caption}>0 of 0: hidden</Text>
			</Section>
		</ScrollView>
	);
}

function Section({
	caption,
	children,
}: {
	caption: string;
	children: ReactNode;
}) {
	return (
		<View style={styles.section}>
			<Text style={styles.caption}>{caption}</Text>
			{children}
		</View>
	);
}

function ChipRow({ on }: { on: NonNullable<LabelChipProps["on"]> }) {
	return (
		<View style={styles.chips}>
			{labels.map(({ color, name }) => (
				<LabelChip key={color} name={name} color={color} on={on} />
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: theme.color.bg,
	},
	content: {
		padding: 20,
		gap: 20,
	},
	back: {
		alignSelf: "flex-start",
		justifyContent: "center",
		minWidth: theme.size.touchTarget,
		minHeight: theme.size.touchTarget,
	},
	backText: {
		fontSize: theme.type.bodyMax,
		color: theme.color["accent-text"],
	},
	title: {
		fontSize: theme.type.screen,
		fontWeight: "600",
		color: theme.color.ink,
	},
	section: {
		gap: theme.space.chipInline,
	},
	caption: {
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
	project: {
		flexDirection: "row",
		alignItems: "center",
		gap: theme.space.chipInline,
	},
	projectName: {
		fontSize: theme.type.bodyMin,
		color: theme.color.ink,
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.space.chipInline,
	},
	surface: {
		padding: theme.space.chipInline,
		backgroundColor: theme.color.surface,
	},
});
