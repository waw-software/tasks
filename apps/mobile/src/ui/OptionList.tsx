import { type LabelColor, theme } from "@waw/design-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "../fonts";
import { LabelChip } from "./LabelChip";

export type ListOption<T extends string> = {
	value: T;
	label: string;
	detail?: string;
	labelColor?: LabelColor;
	disabled?: boolean;
};

type OptionListBase<T extends string> = {
	label: string;
	options: readonly ListOption<T>[];
	helperText?: string;
	action?: { label: string; onPress: () => void };
};

export type OptionListProps<T extends string> = OptionListBase<T> &
	(
		| { mode: "single"; value: T | null; onValueChange: (value: T) => void }
		| {
				mode: "multiple";
				value: readonly T[];
				onValueChange: (value: T[]) => void;
		  }
	);

export function OptionList<T extends string>(props: OptionListProps<T>) {
	const { label, options, helperText, action } = props;

	function isChecked(value: T) {
		return props.mode === "single"
			? props.value === value
			: props.value.includes(value);
	}

	function select(value: T) {
		if (props.mode === "single") {
			props.onValueChange(value);
		} else {
			props.onValueChange(
				props.value.includes(value)
					? props.value.filter((selected) => selected !== value)
					: [...props.value, value],
			);
		}
	}

	return (
		<View style={styles.container}>
			<Text accessibilityRole="header" style={styles.header}>
				{label}
			</Text>
			{helperText !== undefined && (
				<Text style={styles.helper}>{helperText}</Text>
			)}
			<View
				accessibilityRole={props.mode === "single" ? "radiogroup" : undefined}
				accessibilityLabel={label}
				style={options.length > 0 && styles.list}
			>
				{options.map((option, index) => {
					const checked = isChecked(option.value);
					const disabled = option.disabled === true;

					return (
						<Pressable
							key={option.value}
							testID={`option-${option.value}`}
							accessibilityRole={props.mode === "single" ? "radio" : "checkbox"}
							accessibilityLabel={
								option.detail
									? `${option.label}, ${option.detail}`
									: option.label
							}
							accessibilityHint={label}
							accessibilityState={{ checked, disabled }}
							disabled={disabled}
							onPress={() => select(option.value)}
							style={({ pressed }) => [
								styles.row,
								index > 0 && styles.rowDivider,
								pressed && !disabled && styles.rowPressed,
							]}
						>
							<View
								accessible={false}
								accessibilityElementsHidden
								importantForAccessibility="no-hide-descendants"
								style={[
									styles.face,
									props.mode === "single" ? styles.radio : styles.checkbox,
									checked &&
										(props.mode === "single"
											? styles.radioChecked
											: styles.checkboxChecked),
									disabled && styles.faceDisabled,
								]}
							>
								{checked && (
									<View
										style={
											props.mode === "single" ? styles.radioDot : styles.tick
										}
									/>
								)}
							</View>
							<View style={styles.content}>
								{option.labelColor ? (
									<LabelChip name={option.label} color={option.labelColor} />
								) : (
									<Text style={[styles.text, disabled && styles.textDisabled]}>
										{option.label}
									</Text>
								)}
							</View>
							{option.detail !== undefined && (
								<Text style={styles.detail}>{option.detail}</Text>
							)}
						</Pressable>
					);
				})}
			</View>
			{action && (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={action.label}
					onPress={action.onPress}
					style={({ pressed }) => [styles.action, pressed && styles.rowPressed]}
				>
					<Text style={styles.actionLabel}>{action.label}</Text>
				</Pressable>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: theme.space.fieldGap,
	},
	header: {
		fontSize: theme.type.group,
		fontFamily: fontFamilies.bodySemibold,
		letterSpacing: theme.type.groupLetterSpacing,
		color: theme.color.muted,
	},
	helper: {
		fontSize: theme.type.meta,
		fontFamily: fontFamilies.bodyRegular,
		color: theme.color.muted,
	},
	list: {
		overflow: "hidden",
		borderWidth: theme.size.controlBorder,
		borderRadius: theme.radius.card,
		borderColor: theme.color.border,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		gap: theme.space.optionGap,
		minHeight: theme.size.optionRow,
		paddingHorizontal: theme.space.optionInline,
		paddingVertical: theme.space.fieldGap,
		backgroundColor: theme.color.bg,
	},
	rowDivider: {
		borderTopWidth: theme.size.controlBorder,
		borderTopColor: theme.color.divider,
	},
	rowPressed: {
		backgroundColor: theme.color.divider,
	},
	face: {
		width: theme.size.checkbox,
		height: theme.size.checkbox,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: theme.size.controlBorder,
		borderColor: theme.color.muted,
		backgroundColor: theme.color.bg,
	},
	radio: {
		borderRadius: theme.radius.pill,
	},
	checkbox: {
		borderRadius: theme.radius.checkbox,
	},
	radioChecked: {
		borderColor: theme.color.accent,
	},
	checkboxChecked: {
		borderColor: theme.color.ink,
		backgroundColor: theme.color.ink,
	},
	faceDisabled: {
		borderStyle: "dashed",
	},
	radioDot: {
		width: theme.size.radioDot,
		height: theme.size.radioDot,
		borderRadius: theme.radius.pill,
		backgroundColor: theme.color.accent,
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
	content: {
		flex: 1,
	},
	text: {
		fontSize: theme.type.bodyMin,
		fontFamily: fontFamilies.bodyRegular,
		color: theme.color.ink,
	},
	textDisabled: {
		color: theme.color.muted,
	},
	detail: {
		fontSize: theme.type.meta,
		fontFamily: fontFamilies.bodyRegular,
		color: theme.color.muted,
	},
	action: {
		minHeight: theme.size.optionRow,
		justifyContent: "center",
		paddingHorizontal: theme.space.optionInline,
		borderRadius: theme.radius.button,
	},
	actionLabel: {
		fontSize: theme.type.bodyMin,
		fontFamily: fontFamilies.bodyMedium,
		color: theme.color["accent-text"],
	},
});
