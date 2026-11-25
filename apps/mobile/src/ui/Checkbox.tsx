import { theme } from "@waw/design-tokens";
import { Pressable, StyleSheet, View } from "react-native";

export type CheckboxProps = {
	checked: boolean;
	label: string;
	onCheckedChange: (checked: boolean) => void;
};

export function Checkbox({ checked, label, onCheckedChange }: CheckboxProps) {
	return (
		<Pressable
			testID="checkbox-target"
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{ checked }}
			onPress={() => onCheckedChange(!checked)}
			style={styles.target}
		>
			<View
				testID="checkbox-face"
				accessible={false}
				style={[styles.face, checked && styles.checked]}
			>
				{checked && (
					<View
						testID="checkbox-tick"
						accessibilityElementsHidden
						importantForAccessibility="no-hide-descendants"
						style={styles.tick}
					/>
				)}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	target: {
		width: theme.size.touchTarget,
		height: theme.size.touchTarget,
		alignItems: "center",
		justifyContent: "center",
	},
	face: {
		width: theme.size.checkbox,
		height: theme.size.checkbox,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderRadius: theme.radius.checkbox,
		borderColor: theme.color.muted,
		backgroundColor: theme.color.bg,
	},
	checked: {
		borderColor: theme.color.ink,
		backgroundColor: theme.color.ink,
	},
	tick: {
		width: 6,
		height: 11,
		marginBottom: 2,
		borderRightWidth: 2,
		borderBottomWidth: 2,
		borderColor: theme.color.bg,
		transform: [{ rotate: "45deg" }],
	},
});
