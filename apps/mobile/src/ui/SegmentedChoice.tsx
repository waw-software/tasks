import { type Priority, theme } from "@waw/design-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "../fonts";

export type SegmentedChoiceProps<T extends string | number> = {
	label: string;
	options: readonly {
		value: T;
		label: string;
		priority?: Priority;
		disabled?: boolean;
	}[];
	value: T | null;
	onValueChange: (value: T) => void;
	helperText?: string;
};

export function SegmentedChoice<T extends string | number>({
	label,
	options,
	value,
	onValueChange,
	helperText,
}: SegmentedChoiceProps<T>) {
	return (
		<View style={styles.group}>
			<Text accessibilityRole="header" style={styles.header}>
				{label}
			</Text>
			{options.length > 0 && (
				<View
					accessibilityRole="radiogroup"
					accessibilityLabel={label}
					style={styles.row}
				>
					{options.map((option) => {
						const checked = option.value === value;
						const disabled = option.disabled === true;
						const { priority } = option;
						const ink = priority ? theme.priority[priority] : theme.color.ink;
						let textColor: string = ink;
						if (disabled) textColor = theme.color.muted;
						else if (checked && !priority) textColor = theme.color.bg;

						return (
							<Pressable
								key={option.value}
								accessibilityRole="radio"
								accessibilityLabel={option.label}
								accessibilityState={{ checked, disabled }}
								disabled={disabled}
								onPress={() => {
									if (!checked) onValueChange(option.value);
								}}
								style={({ pressed }) => [
									styles.card,
									pressed && !checked && !disabled && styles.pressed,
									checked && [
										styles.selected,
										{
											borderColor: ink,
											backgroundColor: priority
												? selectedFills[priority]
												: theme.color.ink,
										},
									],
									disabled && styles.disabled,
									disabled && !checked && styles.disabledIdle,
								]}
							>
								{priority && <Flag color={textColor} />}
								<Text style={[styles.label, { color: textColor }]}>
									{option.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			)}
			{helperText && <Text style={styles.helper}>{helperText}</Text>}
		</View>
	);
}

function Flag({ color }: { color: string }) {
	return (
		<View
			testID="segment-flag"
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={styles.flag}
		>
			<View style={[styles.flagPole, { backgroundColor: color }]} />
			<View style={[styles.flagCloth, { backgroundColor: color }]} />
		</View>
	);
}

const selectedFills: Record<Priority, string> = {
	1: theme.color["accent-tint"],
	2: theme.color["warning-tint"],
	3: theme.label.blue.bg,
	4: theme.color.surface,
};

const styles = StyleSheet.create({
	group: {
		gap: theme.space.segmentGap,
	},
	header: {
		fontFamily: fontFamilies.bodySemibold,
		fontSize: theme.type.group,
		letterSpacing: theme.type.groupLetterSpacing,
		color: theme.color.muted,
	},
	row: {
		flexDirection: "row",
		gap: theme.space.segmentGap,
	},
	card: {
		flex: 1,
		minWidth: theme.size.touchTarget,
		minHeight: theme.size.segmentMobile,
		alignItems: "center",
		justifyContent: "center",
		gap: theme.space.segmentIconGap,
		borderWidth: theme.size.controlBorder,
		borderRadius: theme.radius.card,
		borderColor: theme.color.muted,
		backgroundColor: theme.color.bg,
	},
	pressed: {
		backgroundColor: theme.color.divider,
	},
	selected: {
		borderWidth: 2,
	},
	disabled: {
		borderStyle: "dashed",
		backgroundColor: theme.color.surface,
	},
	disabledIdle: {
		borderColor: theme.color["border-strong"],
	},
	flag: {
		width: theme.size.pickerMark,
		height: theme.size.pickerMark,
	},
	flagPole: {
		position: "absolute",
		top: 1,
		bottom: 1,
		left: 2,
		width: 2,
	},
	flagCloth: {
		position: "absolute",
		top: 2,
		left: 4,
		width: 10,
		height: 7,
	},
	label: {
		textAlign: "center",
		fontFamily: fontFamilies.bodySemibold,
		fontSize: theme.type.controlSupport,
	},
	helper: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
});
