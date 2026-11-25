import { theme } from "@waw/design-tokens";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamilies, useAppFonts } from "./src/fonts";
import Gallery from "./src/Gallery";

export function isGalleryUrl(url: string | null): boolean {
	return url?.endsWith("/--/gallery") === true;
}

export default function App() {
	const [screen, setScreen] = useState<"shell" | "gallery">("shell");
	const [fontsLoaded, fontError] = useAppFonts();

	useEffect(() => {
		if (fontError) {
			console.warn("Fonts failed to load", fontError);
		}
	}, [fontError]);

	useEffect(() => {
		if (!__DEV__) {
			return;
		}
		const open = (url: string | null) => {
			if (isGalleryUrl(url)) {
				setScreen("gallery");
			}
		};
		Linking.getInitialURL().then((url) => open(url ?? null));
		const subscription = Linking.addEventListener("url", ({ url }) =>
			open(url),
		);
		return () => subscription.remove();
	}, []);

	if (!fontsLoaded && !fontError) {
		return null;
	}

	if (screen === "gallery") {
		return (
			<>
				<Gallery onBack={() => setScreen("shell")} />
				<StatusBar style="auto" />
			</>
		);
	}

	return (
		<View style={styles.container}>
			<Text accessibilityRole="header" style={fontsLoaded && styles.heading}>
				WAW Tasks
			</Text>
			{__DEV__ && (
				<Pressable
					accessibilityRole="button"
					onPress={() => setScreen("gallery")}
					style={styles.galleryButton}
				>
					<Text>Component gallery</Text>
				</Pressable>
			)}
			<StatusBar style="auto" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	heading: {
		fontFamily: fontFamilies.headingSemibold,
	},
	galleryButton: {
		justifyContent: "center",
		minHeight: theme.size.touchTarget,
	},
});
