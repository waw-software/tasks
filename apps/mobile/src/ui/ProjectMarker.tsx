import { type ProjectColor, theme } from "@waw/design-tokens";
import { StyleSheet, View } from "react-native";

export type ProjectMarkerProps = { color: ProjectColor };

export function ProjectMarker({ color }: ProjectMarkerProps) {
	return (
		<View
			testID={`marker-${color}`}
			accessible={false}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[styles.marker, { backgroundColor: theme.project[color] }]}
		/>
	);
}

const styles = StyleSheet.create({
	marker: {
		width: theme.size.projectMarker,
		height: theme.size.projectMarker,
		borderRadius: theme.radius.projectMarker,
	},
});
