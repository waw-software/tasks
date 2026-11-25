import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { SpaceGrotesk_500Medium } from "@expo-google-fonts/space-grotesk/500Medium";
import { SpaceGrotesk_600SemiBold } from "@expo-google-fonts/space-grotesk/600SemiBold";
import { useFonts } from "expo-font";

export const fontFamilies = {
	bodyRegular: "Inter_400Regular",
	bodyMedium: "Inter_500Medium",
	bodySemibold: "Inter_600SemiBold",
	headingMedium: "SpaceGrotesk_500Medium",
	headingSemibold: "SpaceGrotesk_600SemiBold",
} as const;

export function useAppFonts(): [loaded: boolean, error: Error | null] {
	return useFonts({
		[fontFamilies.bodyRegular]: Inter_400Regular,
		[fontFamilies.bodyMedium]: Inter_500Medium,
		[fontFamilies.bodySemibold]: Inter_600SemiBold,
		[fontFamilies.headingMedium]: SpaceGrotesk_500Medium,
		[fontFamilies.headingSemibold]: SpaceGrotesk_600SemiBold,
	});
}
