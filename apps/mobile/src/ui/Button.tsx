import { theme } from "@waw/design-tokens";
import { Pressable, StyleSheet, Text } from "react-native";
import { fontFamilies } from "../fonts";

type ButtonBase = {
	label: string;
	onPress: () => void;
	size?: "regular" | "compact";
	fullWidth?: boolean;
};

export type ButtonProps =
	| (ButtonBase & { variant: "primary" | "secondary"; disabled?: boolean })
	| (ButtonBase & { variant: "text"; disabled?: never });

export function Button(props: ButtonProps) {
	const { label, variant, onPress, size = "regular", fullWidth } = props;
	const disabled = props.variant !== "text" && props.disabled === true;
	const compact = size === "compact";

	return (
		<Pressable
			testID={`button-${label}`}
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.target,
				styles[variant],
				compact && variant !== "text" && styles.compact,
				compact && variant === "secondary" && styles.secondaryCompact,
				pressed && !disabled && pressedTargets[variant],
				disabled && styles.disabled,
				fullWidth && styles.fullWidth,
			]}
		>
			{({ pressed }) => (
				<Text
					style={[
						styles.label,
						labels[variant],
						compact && styles.labelCompact,
						pressed && variant === "text" && styles.textLabelPressed,
						disabled && styles.labelDisabled,
					]}
				>
					{label}
				</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	target: {
		alignItems: "center",
		justifyContent: "center",
		alignSelf: "flex-start",
		minWidth: theme.size.touchTarget,
	},
	primary: {
		minHeight: theme.size.mobilePrimary,
		borderRadius: theme.radius.primary,
		paddingHorizontal: theme.space.primaryButtonInline,
		backgroundColor: theme.color.accent,
	},
	secondary: {
		minHeight: theme.size.mobilePrimary,
		borderRadius: theme.radius.primary,
		paddingHorizontal: theme.space.buttonInline,
		borderWidth: theme.size.controlBorder,
		borderColor: theme.color["border-strong"],
		backgroundColor: theme.color.bg,
	},
	text: {
		minHeight: theme.size.touchTarget,
		borderRadius: theme.radius.button,
		paddingHorizontal: theme.space.textButtonInline,
		backgroundColor: "transparent",
	},
	compact: {
		minHeight: theme.size.touchTarget,
	},
	secondaryCompact: {
		borderRadius: theme.radius.button,
	},
	primaryPressed: {
		backgroundColor: theme.color["accent-dark"],
	},
	secondaryPressed: {
		backgroundColor: theme.color.divider,
	},
	disabled: {
		backgroundColor: theme.color.surface,
	},
	fullWidth: {
		alignSelf: "stretch",
	},
	label: {
		textAlign: "center",
		fontSize: theme.type.bodyMax,
	},
	primaryLabel: {
		fontFamily: fontFamilies.bodySemibold,
		color: theme.color.bg,
	},
	secondaryLabel: {
		fontFamily: fontFamilies.bodyMedium,
		color: theme.color.ink,
	},
	textLabel: {
		fontFamily: fontFamilies.bodyMedium,
		fontSize: theme.type.bodyMin,
		color: theme.color["accent-text"],
	},
	labelCompact: {
		fontSize: theme.type.bodyMin,
	},
	textLabelPressed: {
		color: theme.color["accent-dark"],
	},
	labelDisabled: {
		color: theme.color.muted,
	},
});

const pressedTargets = {
	primary: styles.primaryPressed,
	secondary: styles.secondaryPressed,
	text: undefined,
};

const labels = {
	primary: styles.primaryLabel,
	secondary: styles.secondaryLabel,
	text: styles.textLabel,
};
