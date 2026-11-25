import { theme } from "@waw/design-tokens";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import { fontFamilies } from "../fonts";
import { Button } from "./Button";

export type BannerProps = {
	tone: "warning" | "success" | "update";
	title: string;
	message?: string;
	action?: { label: string; onPress: () => void };
};

export function Banner({ tone, title, message, action }: BannerProps) {
	const copy = message ? `${title}. ${message}` : title;
	const announced = useRef(copy);

	// iOS has no live regions, so a changed result is announced by hand.
	useEffect(() => {
		if (announced.current === copy) {
			return;
		}
		announced.current = copy;
		AccessibilityInfo.announceForAccessibilityWithOptions(copy, {
			queue: true,
		});
	}, [copy]);

	return (
		<View testID={`banner-${tone}`} style={[styles.banner, styles[tone]]}>
			<View
				accessible
				accessibilityRole="text"
				accessibilityLabel={copy}
				style={styles.copy}
			>
				<Text style={[styles.title, tone === "success" && styles.successTitle]}>
					{title}
				</Text>
				{message ? <Text style={styles.message}>{message}</Text> : null}
			</View>
			{action && (
				<View testID="banner-action" style={styles.action}>
					<Button
						variant="text"
						size="compact"
						label={action.label}
						onPress={action.onPress}
					/>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	banner: {
		gap: theme.space.bannerGap,
		paddingVertical: theme.space.bannerBlock,
		paddingHorizontal: theme.space.bannerInline,
		borderRadius: theme.radius.card,
	},
	warning: {
		backgroundColor: theme.color["warning-tint"],
	},
	success: {
		borderRadius: theme.radius.input,
		backgroundColor: theme.color["success-tint"],
	},
	update: {
		backgroundColor: theme.color["accent-tint"],
	},
	copy: {
		gap: theme.space.bannerCopyGap,
	},
	title: {
		fontFamily: fontFamilies.bodySemibold,
		fontSize: theme.type.bodyMin,
		color: theme.color.ink,
	},
	successTitle: {
		fontFamily: fontFamilies.bodyMedium,
		fontSize: theme.type.controlSupport,
		color: theme.color["success-text"],
	},
	message: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.controlSupport,
		color: theme.color["ink-2"],
	},
	action: {
		alignSelf: "flex-end",
	},
});
