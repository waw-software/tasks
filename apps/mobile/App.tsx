import { theme } from "@waw/design-tokens";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamilies, useAppFonts } from "./src/fonts";
import Gallery, { type GallerySection } from "./src/Gallery";

export function galleryRoute(url: string | null): GallerySection | null {
	if (url === null) {
		return null;
	}
	let path: string;
	try {
		path = new URL(url).pathname;
	} catch {
		return null;
	}
	if (path.endsWith("/--/gallery")) {
		return "components";
	}
	return path.endsWith("/--/gallery/rows") ? "rows" : null;
}

export default function App() {
	const [screen, setScreen] = useState<"shell" | "gallery" | "rows">("shell");
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
			const section = galleryRoute(url);
			if (section) {
				setScreen(section === "rows" ? "rows" : "gallery");
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

	if (screen !== "shell") {
		const section = screen === "rows" ? "rows" : "components";
		return (
			<>
				<Gallery
					key={section}
					section={section}
					onBack={() => setScreen(screen === "rows" ? "gallery" : "shell")}
					onOpenRows={() => setScreen("rows")}
				/>
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
