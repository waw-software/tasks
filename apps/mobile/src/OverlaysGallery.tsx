import { theme } from "@waw/design-tokens";
import { type ComponentRef, useRef, useState } from "react";
import {
	AccessibilityInfo,
	findNodeHandle,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { fontFamilies } from "./fonts";
import { Button } from "./ui/Button";
import { LabelChip } from "./ui/LabelChip";
import { ProjectMarker } from "./ui/ProjectMarker";
import { Sheet } from "./ui/Sheet";
import { TextInput } from "./ui/TextInput";

export default function OverlaysGallery({
	quickAddOpen = false,
}: {
	quickAddOpen?: boolean;
}) {
	const [open, setOpen] = useState(quickAddOpen);
	const [task, setTask] = useState(
		"Pay rent every 1st at 9:00 p1 #Home @money",
	);
	const [added, setAdded] = useState(false);
	// Button forwards no ref, and VoiceOver focus needs the launcher itself.
	const launcher = useRef<ComponentRef<typeof View>>(null);

	function focusLauncher() {
		const handle = findNodeHandle(launcher.current);
		if (handle != null) {
			AccessibilityInfo.setAccessibilityFocus(handle);
		}
	}

	return (
		<>
			<Pressable
				ref={launcher}
				accessibilityRole="button"
				onPress={() => setOpen(true)}
				style={({ pressed }) => [
					styles.launcher,
					pressed && styles.launcherPressed,
				]}
			>
				<Text style={styles.launcherText}>Quick add</Text>
			</Pressable>
			{added && <Text style={styles.text}>Selected: Add task</Text>}
			<Sheet
				open={open}
				title="New task"
				onDismiss={() => setOpen(false)}
				onAfterClose={focusLauncher}
				footer={
					<View style={styles.actions}>
						<Button
							variant="secondary"
							label="Cancel"
							onPress={() => setOpen(false)}
						/>
						<Button
							variant="primary"
							label="Add task"
							onPress={() => {
								setAdded(true);
								setOpen(false);
							}}
						/>
					</View>
				}
			>
				<View style={styles.body}>
					<TextInput label="Task" value={task} onValueChange={setTask} />
					<Text style={styles.caption}>Understood as</Text>
					<View style={styles.chips}>
						<View style={styles.chip}>
							<Text style={styles.chipText}>Every month on the 1st</Text>
						</View>
						<View style={styles.chip}>
							<Text style={styles.chipText}>09:00</Text>
						</View>
						<View style={[styles.chip, styles.priorityChip]}>
							<Text style={[styles.chipText, styles.priorityText]}>
								Priority 1
							</Text>
						</View>
						<View style={styles.chip}>
							<ProjectMarker color="red" />
							<Text style={styles.chipText}>Home</Text>
						</View>
						<LabelChip name="@money" color="green" />
					</View>
					<Text style={styles.caption}>
						Type it the way you say it: dates, p1 to p4, #project, @label.
					</Text>
				</View>
			</Sheet>
		</>
	);
}

const styles = StyleSheet.create({
	launcher: {
		alignSelf: "flex-start",
		alignItems: "center",
		justifyContent: "center",
		minWidth: theme.size.touchTarget,
		minHeight: theme.size.mobilePrimary,
		borderRadius: theme.radius.primary,
		paddingHorizontal: theme.space.primaryButtonInline,
		backgroundColor: theme.color.accent,
	},
	launcherPressed: {
		backgroundColor: theme.color["accent-dark"],
	},
	launcherText: {
		fontFamily: fontFamilies.bodySemibold,
		fontSize: theme.type.bodyMax,
		color: theme.color.bg,
	},
	text: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.bodyMin,
		color: theme.color.ink,
	},
	body: {
		gap: theme.space.overlayGap,
	},
	caption: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
	chips: {
		flexDirection: "row",
		flexWrap: "wrap",
		alignItems: "center",
		gap: theme.space.chipInline,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		gap: theme.space.chipInline,
		paddingVertical: theme.space.chipBlock,
		paddingHorizontal: theme.space.chipInline,
		borderRadius: theme.radius.chip,
		backgroundColor: theme.color.surface,
	},
	chipText: {
		fontFamily: fontFamilies.bodyMedium,
		fontSize: theme.type.chip,
		color: theme.color.ink,
	},
	priorityChip: {
		backgroundColor: theme.color["accent-tint"],
	},
	priorityText: {
		color: theme.color["accent-dark"],
	},
	actions: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "flex-end",
		gap: theme.space.chipInline,
	},
});
