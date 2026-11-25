import { theme } from "@waw/design-tokens";
import { StyleSheet, View } from "react-native";
import type { TabId } from "./TabBar";

export function TabBarIcon({
	icon,
	color,
}: {
	icon: TabId | "add";
	color: string;
}): React.JSX.Element {
	const stroke = { backgroundColor: color };
	const outline = { borderColor: color };

	return (
		<View
			testID={`tab-icon-${icon}`}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={icon === "add" ? styles.addBox : styles.box}
		>
			{icon === "today" && (
				<>
					<View style={[styles.calendarPage, outline]} />
					<View style={[styles.calendarRule, stroke]} />
					<View style={[styles.calendarPin, styles.calendarPinLeft, stroke]} />
					<View style={[styles.calendarPin, styles.calendarPinRight, stroke]} />
				</>
			)}
			{icon === "upcoming" && (
				<>
					<View style={[styles.listLine, styles.listFirst, stroke]} />
					<View style={[styles.listLine, styles.listSecond, stroke]} />
					<View style={[styles.listLine, styles.listLast, stroke]} />
				</>
			)}
			{icon === "search" && (
				<>
					<View style={[styles.lens, outline]} />
					<View style={[styles.lensHandle, stroke]} />
				</>
			)}
			{icon === "browse" && (
				<>
					<View style={[styles.square, styles.topLeft, outline]} />
					<View style={[styles.square, styles.topRight, outline]} />
					<View style={[styles.square, styles.bottomLeft, outline]} />
					<View style={[styles.square, styles.bottomRight, outline]} />
				</>
			)}
			{icon === "add" && (
				<>
					<View style={[styles.plusAcross, stroke]} />
					<View style={[styles.plusDown, stroke]} />
				</>
			)}
		</View>
	);
}

// Shapes are placed on the 20 px (navigation) and 24 px (add) icon boxes.
const styles = StyleSheet.create({
	box: {
		width: theme.size.navIcon,
		height: theme.size.navIcon,
	},
	addBox: {
		width: theme.size.fabIcon,
		height: theme.size.fabIcon,
	},
	calendarPage: {
		position: "absolute",
		top: 3,
		left: 2,
		width: 16,
		height: 15,
		borderWidth: 2,
		borderRadius: 3,
	},
	calendarRule: {
		position: "absolute",
		top: 7,
		left: 3,
		width: 14,
		height: 2,
	},
	calendarPin: {
		position: "absolute",
		top: 1,
		width: 2,
		height: 4,
		borderRadius: 1,
	},
	calendarPinLeft: {
		left: 6,
	},
	calendarPinRight: {
		left: 12,
	},
	listLine: {
		position: "absolute",
		left: 3,
		height: 2,
		borderRadius: 1,
	},
	listFirst: {
		top: 5,
		width: 14,
	},
	listSecond: {
		top: 9,
		width: 14,
	},
	listLast: {
		top: 13,
		width: 8,
	},
	lens: {
		position: "absolute",
		top: 2,
		left: 2,
		width: 13,
		height: 13,
		borderWidth: 2,
		borderRadius: theme.radius.pill,
	},
	lensHandle: {
		position: "absolute",
		top: 14,
		left: 12,
		width: 7,
		height: 2,
		borderRadius: 1,
		transform: [{ rotate: "45deg" }],
	},
	square: {
		position: "absolute",
		width: 7,
		height: 7,
		borderWidth: 2,
		borderRadius: 1,
	},
	topLeft: {
		top: 2,
		left: 2,
	},
	topRight: {
		top: 2,
		left: 11,
	},
	bottomLeft: {
		top: 11,
		left: 2,
	},
	bottomRight: {
		top: 11,
		left: 11,
	},
	plusAcross: {
		position: "absolute",
		top: 11,
		left: 5,
		width: 14,
		height: 2,
		borderRadius: 1,
	},
	plusDown: {
		position: "absolute",
		top: 5,
		left: 11,
		width: 2,
		height: 14,
		borderRadius: 1,
	},
});
