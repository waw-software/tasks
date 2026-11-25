import { theme } from "@waw/design-tokens";
import { type ReactNode, useEffect, useRef } from "react";
import {
	KeyboardAvoidingView,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { fontFamilies } from "../fonts";

export type DismissReason = "close" | "escape" | "backdrop";

export type SheetProps = {
	open: boolean;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	onDismiss: (reason: DismissReason) => void;
	dismissOnBackdrop?: boolean;
	onAfterClose?: () => void;
};

export function Sheet({
	open,
	title,
	children,
	footer,
	onDismiss,
	dismissOnBackdrop = false,
	onAfterClose,
}: SheetProps) {
	const awaitingAfterClose = useRef(open);

	useEffect(() => {
		if (open) {
			awaitingAfterClose.current = true;
		}
	}, [open]);

	function finishClose() {
		if (open || !awaitingAfterClose.current) {
			return;
		}
		awaitingAfterClose.current = false;
		onAfterClose?.();
	}

	return (
		<Modal
			transparent
			animationType="slide"
			presentationStyle="overFullScreen"
			visible={open}
			onRequestClose={() => onDismiss("escape")}
			onDismiss={finishClose}
		>
			<View style={styles.frame}>
				<Pressable
					testID="sheet-scrim"
					accessible={false}
					importantForAccessibility="no"
					disabled={!dismissOnBackdrop}
					onPress={() => onDismiss("backdrop")}
					style={styles.scrim}
				/>
				<KeyboardAvoidingView
					behavior="padding"
					pointerEvents="box-none"
					style={styles.dock}
				>
					<View
						testID="sheet-surface"
						accessibilityViewIsModal
						onAccessibilityEscape={() => onDismiss("escape")}
						style={styles.surface}
					>
						<View style={styles.header}>
							<Text accessibilityRole="header" style={styles.title}>
								{title}
							</Text>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Close sheet"
								onPress={() => onDismiss("close")}
								style={({ pressed }) => [
									styles.close,
									pressed && styles.closePressed,
								]}
							>
								<View style={[styles.stroke, styles.strokeDown]} />
								<View style={[styles.stroke, styles.strokeUp]} />
							</Pressable>
						</View>
						<ScrollView keyboardShouldPersistTaps="handled" style={styles.body}>
							{children}
						</ScrollView>
						{footer ? <View style={styles.footer}>{footer}</View> : null}
					</View>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	frame: {
		flex: 1,
	},
	scrim: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		backgroundColor: theme.overlay.scrim,
	},
	dock: {
		flex: 1,
		justifyContent: "flex-end",
	},
	surface: {
		maxHeight: `${theme.size.sheetMaxHeightPercent}%`,
		gap: theme.space.overlayGap,
		paddingTop: theme.space.sheetPadding,
		paddingHorizontal: theme.space.sheetPadding,
		paddingBottom: theme.space.sheetBottom,
		borderTopLeftRadius: theme.radius.overlayMax,
		borderTopRightRadius: theme.radius.overlayMax,
		backgroundColor: theme.color.bg,
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		gap: theme.space.overlayGap,
	},
	title: {
		flex: 1,
		fontFamily: fontFamilies.headingSemibold,
		fontSize: theme.type.sectionMin,
		color: theme.color.ink,
	},
	close: {
		width: theme.size.touchTarget,
		height: theme.size.touchTarget,
		alignItems: "center",
		justifyContent: "center",
		borderRadius: theme.radius.nav,
	},
	closePressed: {
		backgroundColor: theme.color.divider,
	},
	stroke: {
		position: "absolute",
		width: theme.size.navIcon,
		height: theme.size.focusRing,
		backgroundColor: theme.color.ink,
	},
	strokeDown: {
		transform: [{ rotate: "45deg" }],
	},
	strokeUp: {
		transform: [{ rotate: "-45deg" }],
	},
	// The body gives up height first, so the footer stays on screen.
	body: {
		flexGrow: 0,
		flexShrink: 1,
	},
	footer: {
		flexShrink: 0,
	},
});
