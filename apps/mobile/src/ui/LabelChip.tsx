import { type LabelColor, theme } from "@waw/design-tokens";
import { StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "../fonts";

export type LabelChipProps = {
	name: string;
	color: LabelColor;
	on?: "bg" | "surface";
};

export function LabelChip({ name, color, on = "bg" }: LabelChipProps) {
	const pair = theme.label[color];
	const backgroundColor = on === "surface" ? pair.surfaceBg : pair.bg;
	const ink = on === "surface" ? pair.surfaceInk : pair.ink;

	return (
		<View style={[styles.chip, { backgroundColor }]}>
			<Text style={[styles.name, { color: ink }]}>{name}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	chip: {
		alignSelf: "flex-start",
		paddingVertical: theme.space.chipBlock,
		paddingHorizontal: theme.space.chipInline,
		borderRadius: theme.radius.chip,
	},
	name: {
		fontSize: theme.type.chip,
		fontFamily: fontFamilies.bodyMedium,
	},
});
