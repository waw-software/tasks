import { theme } from "@waw/design-tokens";
import { StyleSheet, Text } from "react-native";

export type GroupHeaderProps = {
	label: string;
	count?: number;
	tone?: "default" | "overdue";
};

export function GroupHeader({
	label,
	count,
	tone = "default",
}: GroupHeaderProps) {
	const title = label.toUpperCase();

	return (
		<Text
			accessibilityRole="header"
			style={[styles.header, tone === "overdue" && styles.overdue]}
		>
			{count === undefined ? title : `${title} ${count}`}
		</Text>
	);
}

const styles = StyleSheet.create({
	header: {
		fontSize: theme.type.group,
		fontWeight: "600",
		letterSpacing: theme.type.groupLetterSpacing,
		color: theme.color.muted,
	},
	overdue: {
		color: theme.color["accent-text"],
	},
});
