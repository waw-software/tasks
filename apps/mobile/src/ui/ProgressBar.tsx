import { theme } from "@waw/design-tokens";
import { StyleSheet, Text, View } from "react-native";

export type ProgressBarProps = { done: number; total: number };

export function ProgressBar({ done, total }: ProgressBarProps) {
	if (total <= 0) {
		return null;
	}

	return (
		<View style={styles.row}>
			<View
				accessible
				accessibilityRole="progressbar"
				accessibilityLabel="Tasks done"
				accessibilityValue={{ min: 0, max: total, now: done }}
				style={styles.track}
			>
				<View style={[styles.fill, { width: `${(done / total) * 100}%` }]} />
			</View>
			<Text style={styles.text}>{`${done} of ${total} done`}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: theme.space.chipInline,
	},
	track: {
		flex: 1,
		height: theme.size.progress,
		overflow: "hidden",
		borderRadius: theme.radius.pill,
		backgroundColor: theme.color.divider,
	},
	fill: {
		height: "100%",
		backgroundColor: theme.color.ink,
	},
	text: {
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
});
