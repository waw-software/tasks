import { type LabelColor, type ProjectColor, theme } from "@waw/design-tokens";
import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "./fonts";
import { Banner } from "./ui/Banner";
import { Button } from "./ui/Button";
import { Checkbox } from "./ui/Checkbox";
import { GroupHeader } from "./ui/GroupHeader";
import { LabelChip, type LabelChipProps } from "./ui/LabelChip";
import { ProgressBar } from "./ui/ProgressBar";
import { ProjectMarker } from "./ui/ProjectMarker";
import { TaskRow, type TaskRowProps } from "./ui/TaskRow";
import { TextInput } from "./ui/TextInput";

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

type RowFixture = Omit<TaskRowProps, "checked" | "onCheckedChange"> & {
	initiallyChecked?: boolean;
};

const rows: readonly RowFixture[] = [
	{
		title: "Pay rent",
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
		priority: 2,
		selected: true,
		project: { name: "Work", color: "blue" },
	},
	{
		title: "Buy milk",
		priority: 4,
		initiallyChecked: true,
		scheduleText: "17:00",
		labels: [{ name: "@errands", color: "violet" }],
		project: { name: "Home", color: "red" },
	},
	{
		title: "Pick up the dry cleaning",
		priority: 3,
		pendingSync: true,
		subtasks: { done: 1, total: 3 },
		labels: [{ name: "@waiting", color: "amber" }],
		project: { name: "Personal", color: "green" },
	},
	{
		title:
			"Call the landlord about the broken heating in the bathroom before the weekend",
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

export type GallerySection = "components" | "rows" | "controls";

const titles: Record<GallerySection, string> = {
	components: "Component gallery",
	rows: "Task row gallery",
	controls: "Controls",
};

export default function Gallery({
	section = "components",
	onBack,
	onOpenRows,
	onOpenControls,
}: {
	section?: GallerySection;
	onBack: () => void;
	onOpenRows?: () => void;
	onOpenControls?: () => void;
}) {
	return (
		<ScrollView
			contentInsetAdjustmentBehavior="automatic"
			style={styles.screen}
			contentContainerStyle={styles.content}
			keyboardShouldPersistTaps="handled"
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
				{titles[section]}
			</Text>

			{section === "components" && (
				<>
					<GalleryLink label="Task rows" onPress={onOpenRows} />
					<GalleryLink label="Controls" onPress={onOpenControls} />
					<ComponentExamples />
				</>
			)}
			{section === "rows" && <RowExamples />}
			{section === "controls" && <ControlExamples />}
		</ScrollView>
	);
}

function GalleryLink({
	label,
	onPress,
}: {
	label: string;
	onPress: (() => void) | undefined;
}) {
	return (
		<Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
			<Text style={styles.linkText}>{label}</Text>
		</Pressable>
	);
}

function ComponentExamples() {
	return (
		<>
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
		</>
	);
}

function RowExamples() {
	return (
		<>
			<Section caption="Checkbox">
				<CheckboxExample label="Unchecked example" />
				<CheckboxExample label="Checked example" initiallyChecked />
			</Section>

			<Section caption="Task rows">
				<View>
					{rows.map((row) => (
						<RowExample key={row.title} {...row} />
					))}
				</View>
			</Section>
		</>
	);
}

function ControlExamples() {
	const [address, setAddress] = useState("https://tasks.example.com");
	const [token, setToken] = useState("example-only");
	const [tokenEdited, setTokenEdited] = useState(false);
	const [selected, setSelected] = useState("none");
	const action = (label: string) => ({
		label,
		onPress: () => setSelected(label),
	});

	return (
		<>
			<Section caption="Text inputs">
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
					{...(!tokenEdited && { errorText: "Enter a valid access token." })}
				/>
			</Section>

			<Section caption="Banners">
				<Banner
					tone="warning"
					title="Working offline"
					message="3 changes are saved on this phone and will sync when the server is reachable."
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

			<Section caption="Buttons">
				<Button variant="primary" fullWidth {...action("Connect")} />
				<Button
					variant="secondary"
					fullWidth
					{...action("Continue with limited features")}
				/>
				<View style={styles.inlineButtons}>
					<Button variant="text" {...action("How to deploy with Docker")} />
					<Button
						variant="primary"
						size="compact"
						disabled
						{...action("Check again")}
					/>
				</View>
			</Section>

			<Text style={styles.selection}>Selected: {selected}</Text>
		</>
	);
}

function CheckboxExample({
	label,
	initiallyChecked = false,
}: {
	label: string;
	initiallyChecked?: boolean;
}) {
	const [checked, setChecked] = useState(initiallyChecked);

	return (
		<View style={styles.example}>
			<Checkbox checked={checked} label={label} onCheckedChange={setChecked} />
			<Text style={styles.exampleLabel}>{label}</Text>
		</View>
	);
}

function RowExample({ initiallyChecked = false, ...row }: RowFixture) {
	const [checked, setChecked] = useState(initiallyChecked);

	return <TaskRow {...row} checked={checked} onCheckedChange={setChecked} />;
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
	link: {
		alignSelf: "flex-start",
		justifyContent: "center",
		minHeight: theme.size.touchTarget,
	},
	linkText: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.bodyMax,
		color: theme.color["accent-text"],
	},
	example: {
		flexDirection: "row",
		alignItems: "center",
		gap: theme.space.chipInline,
	},
	inlineButtons: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		gap: theme.space.chipInline,
	},
	selection: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.bodyMin,
		color: theme.color.ink,
	},
	exampleLabel: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.bodyMin,
		color: theme.color.ink,
	},
	backText: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.bodyMax,
		color: theme.color["accent-text"],
	},
	title: {
		fontSize: theme.type.screen,
		fontFamily: fontFamilies.headingSemibold,
		color: theme.color.ink,
	},
	section: {
		gap: theme.space.chipInline,
	},
	caption: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
	project: {
		flexDirection: "row",
		alignItems: "center",
		gap: theme.space.chipInline,
	},
	projectName: {
		fontFamily: fontFamilies.bodyRegular,
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
