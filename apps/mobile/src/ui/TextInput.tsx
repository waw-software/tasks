import { theme } from "@waw/design-tokens";
import { useEffect, useRef, useState } from "react";
import {
	AccessibilityInfo,
	TextInput as NativeTextInput,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { fontFamilies } from "../fonts";

export type TextInputProps = {
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	kind?: "text" | "url" | "token";
	helperText?: string;
	errorText?: string;
	disabled?: boolean;
};

export function TextInput({
	label,
	value,
	onValueChange,
	kind = "text",
	helperText,
	errorText,
	disabled = false,
}: TextInputProps) {
	const [focused, setFocused] = useState(false);
	// The error present at mount stays readable on screen and is not announced.
	const lastError = useRef(errorText);
	const verbatim = kind !== "text";

	useEffect(() => {
		if (errorText && errorText !== lastError.current) {
			AccessibilityInfo.announceForAccessibility(`${label}. ${errorText}`);
		}
		lastError.current = errorText;
	}, [label, errorText]);

	return (
		<View style={styles.field}>
			<Text style={styles.label}>{label}</Text>
			<NativeTextInput
				testID={`input-${label}`}
				value={value}
				onChangeText={onValueChange}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				accessibilityLabel={label}
				accessibilityHint={errorText || helperText}
				accessibilityState={{ disabled }}
				editable={!disabled}
				keyboardType={kind === "url" ? "url" : "default"}
				secureTextEntry={kind === "token"}
				autoCapitalize={verbatim ? "none" : undefined}
				autoCorrect={verbatim ? false : undefined}
				style={[
					styles.input,
					verbatim && styles.mono,
					(focused || !!errorText) && styles.accentEdge,
					disabled && styles.disabled,
				]}
			/>
			{errorText ? (
				<Text style={styles.error}>{errorText}</Text>
			) : (
				!!helperText && <Text style={styles.helper}>{helperText}</Text>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	field: {
		gap: theme.space.fieldGap,
	},
	label: {
		fontFamily: fontFamilies.bodyMedium,
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
	input: {
		minHeight: theme.size.mobileInputMax,
		paddingHorizontal: theme.space.inputInline,
		borderWidth: theme.size.controlBorder,
		borderRadius: theme.radius.input,
		borderColor: theme.color.muted,
		backgroundColor: theme.color.surface,
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.bodyMax,
		color: theme.color.ink,
	},
	mono: {
		fontFamily: "ui-monospace",
	},
	accentEdge: {
		borderColor: theme.color["accent-text"],
	},
	disabled: {
		borderColor: theme.color["border-strong"],
		color: theme.color.muted,
	},
	helper: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.meta,
		color: theme.color.muted,
	},
	error: {
		fontFamily: fontFamilies.bodyRegular,
		fontSize: theme.type.meta,
		color: theme.color["accent-text"],
	},
});
