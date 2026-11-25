import { theme } from "@waw/design-tokens";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Gallery from "./src/Gallery";

export default function App() {
	const [screen, setScreen] = useState<"shell" | "gallery">("shell");

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
			<Text accessibilityRole="header">WAW Tasks</Text>
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
	galleryButton: {
		justifyContent: "center",
		minHeight: theme.size.touchTarget,
	},
});
