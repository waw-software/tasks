import { type LabelColor, type ProjectColor, theme } from "@waw/design-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "../fonts";

export type ColorSwatchPickerProps = { label: string } & (
	| {
			palette: "project";
			value: ProjectColor | null;
			onValueChange: (value: ProjectColor) => void;
	  }
	| {
			palette: "label";
			value: LabelColor | null;
			onValueChange: (value: LabelColor) => void;
	  }
);

type Swatch = {
	color: ProjectColor;
	fill: string;
	edge?: string;
	tick: string;
	select: () => void;
};

const names: Record<ProjectColor, string> = {
	red: "Red",
	blue: "Blue",
	green: "Green",
	amber: "Amber",
	violet: "Violet",
	black: "Black",
};

const projectOrder: readonly ProjectColor[] = [
	"red",
	"blue",
	"green",
	"amber",
	"violet",
	"black",
];

const labelOrder: readonly LabelColor[] = ["green", "blue", "amber", "violet"];

function swatchesOf(props: ColorSwatchPickerProps): Swatch[] {
	if (props.palette === "project") {
		return projectOrder.map((color) => ({
			color,
			fill: theme.project[color],
			tick: theme.color.bg,
			select: () => props.onValueChange(color),
		}));
	}
	return labelOrder.map((color) => ({
		color,
		fill: theme.label[color].bg,
		edge: theme.label[color].ink,
		tick: theme.label[color].ink,
		select: () => props.onValueChange(color),
	}));
}

export function ColorSwatchPicker(props: ColorSwatchPickerProps) {
	const { label, value } = props;

	return (
		<View style={styles.group}>
			<Text accessibilityRole="header" style={styles.header}>
				{value ? `${label} · ${names[value]}` : label}
			</Text>
			<View
				accessibilityRole="radiogroup"
				accessibilityLabel={label}
				style={styles.row}
			>
				{swatchesOf(props).map(({ color, fill, edge, tick, select }) => {
					const checked = color === value;

					return (
						<Pressable
							key={color}
							accessibilityRole="radio"
							accessibilityLabel={names[color]}
							accessibilityState={{ checked }}
							onPress={() => {
								if (!checked) select();
							}}
							style={styles.target}
						>
							{({ pressed }) => (
								<>
									<View testID={`swatch-circle-${color}`} style={styles.circle}>
										<View
											testID={`swatch-face-${color}`}
											style={[
												styles.face,
												{ backgroundColor: fill },
												edge !== undefined && [
													styles.edge,
													{ borderColor: edge },
												],
												pressed && styles.facePressed,
											]}
										>
											{checked && (
												<View
													testID={`swatch-tick-${color}`}
													accessibilityElementsHidden
													importantForAccessibility="no-hide-descendants"
													style={styles.tick}
												>
													<View
														testID={`swatch-tick-shape-${color}`}
														style={[styles.tickShape, { borderColor: tick }]}
													/>
												</View>
											)}
										</View>
										{checked && (
											<View
												testID={`swatch-ring-${color}`}
												pointerEvents="none"
												accessibilityElementsHidden
												importantForAccessibility="no-hide-descendants"
												style={styles.ring}
											>
												<View
													testID={`swatch-gap-${color}`}
													style={styles.gap}
												/>
											</View>
										)}
									</View>
									<Text style={styles.name}>{names[color]}</Text>
								</>
							)}
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

// The ring sits outside the circle: a 2 point white gap, then 2 points of ink.
const ringOutset = -4;

const styles = StyleSheet.create({
	group: {
		gap: theme.space.swatchLabelGap,
	},
	header: {
		fontFamily: fontFamilies.bodyMedium,
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
	row: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: theme.space.swatchGap,
	},
	target: {
		minWidth: theme.size.touchTarget,
		minHeight: theme.size.touchTarget,
		alignItems: "center",
		gap: theme.space.fieldGap,
	},
	circle: {
		width: theme.size.touchTarget,
		height: theme.size.touchTarget,
	},
	face: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: theme.radius.pill,
	},
	edge: {
		borderWidth: theme.size.controlBorder,
	},
	facePressed: {
		borderWidth: 2,
		borderColor: theme.color.muted,
	},
	name: {
		textAlign: "center",
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.group,
		color: theme.color.muted,
	},
	tick: {
		width: theme.size.pickerMark,
		height: theme.size.pickerMark,
		alignItems: "center",
		justifyContent: "center",
	},
	tickShape: {
		width: 6,
		height: 11,
		marginBottom: 2,
		borderRightWidth: 2,
		borderBottomWidth: 2,
		transform: [{ rotate: "45deg" }],
	},
	ring: {
		position: "absolute",
		top: ringOutset,
		right: ringOutset,
		bottom: ringOutset,
		left: ringOutset,
		borderWidth: 2,
		borderRadius: theme.radius.pill,
		borderColor: theme.color.ink,
	},
	gap: {
		flex: 1,
		borderWidth: 2,
		borderRadius: theme.radius.pill,
		borderColor: theme.color.bg,
	},
});
