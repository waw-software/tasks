import { theme } from "@waw/design-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "../fonts";
import { TabBarIcon } from "./TabBarIcons";

export type TabId = "today" | "upcoming" | "search" | "browse";

export type TabBarProps = {
	activeTab: TabId;
	onTabChange: (tab: TabId) => void;
	onAdd?: () => void;
};

const tabs: readonly { id: TabId; label: string }[] = [
	{ id: "today", label: "Today" },
	{ id: "upcoming", label: "Upcoming" },
	{ id: "search", label: "Search" },
	{ id: "browse", label: "Browse" },
];

export function TabBar({ activeTab, onTabChange, onAdd }: TabBarProps) {
	return (
		<View>
			{onAdd && (
				<View style={styles.fabDock}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Add task"
						onPress={onAdd}
						style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
					>
						<TabBarIcon icon="add" color={theme.color.bg} />
					</Pressable>
				</View>
			)}
			<View style={styles.bar}>
				{tabs.map(({ id, label }) => {
					const selected = id === activeTab;
					const color = selected ? theme.color.accent : theme.color.muted;

					return (
						<Pressable
							key={id}
							accessibilityRole="button"
							accessibilityLabel={label}
							accessibilityState={{ selected }}
							onPress={() => onTabChange(id)}
							style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
						>
							<TabBarIcon icon={id} color={color} />
							<Text style={[styles.label, selected && styles.labelCurrent]}>
								{label}
							</Text>
							<View
								style={[styles.underline, selected && styles.underlineCurrent]}
							/>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	fabDock: {
		alignItems: "flex-end",
		paddingRight: theme.space.fabInline,
		paddingBottom: theme.space.fabAboveTab,
	},
	fab: {
		width: theme.size.fab,
		height: theme.size.fab,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: theme.radius.overlayMax,
		backgroundColor: theme.color.accent,
	},
	fabPressed: {
		backgroundColor: theme.color["accent-dark"],
	},
	bar: {
		flexDirection: "row",
		paddingTop: theme.space.tabTop,
		paddingHorizontal: theme.space.tabInline,
		paddingBottom: theme.space.navigationBottom,
		borderTopWidth: theme.size.controlBorder,
		borderTopColor: theme.color.divider,
		backgroundColor: theme.color.bg,
	},
	tab: {
		flex: 1,
		minWidth: theme.size.touchTarget,
		minHeight: theme.size.tab,
		alignItems: "center",
		justifyContent: "center",
		gap: theme.space.tabIconGap,
	},
	pressed: {
		backgroundColor: theme.color.divider,
	},
	label: {
		fontFamily: fontFamilies.bodyMedium,
		fontSize: theme.type.tab,
		color: theme.color.muted,
	},
	labelCurrent: {
		fontFamily: fontFamilies.bodySemibold,
		color: theme.color.accent,
	},
	// The idle underline keeps its space so the labels do not move on selection.
	underline: {
		width: theme.size.navIcon,
		height: theme.size.focusRing,
		backgroundColor: "transparent",
	},
	underlineCurrent: {
		backgroundColor: theme.color.accent,
	},
});
