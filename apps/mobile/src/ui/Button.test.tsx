import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, type ButtonProps } from "./Button";

function Consumer() {
	const [selected, setSelected] = useState("nothing");
	return (
		<>
			<Text>{`Selected: ${selected}`}</Text>
			<Button
				variant="primary"
				label="Connect"
				onPress={() => setSelected("Connect")}
			/>
			<Button
				variant="secondary"
				label="Check again"
				disabled
				onPress={() => setSelected("Check again")}
			/>
		</>
	);
}

// Pressable's host view only has responder handlers, so a held press is a
// responder grant; its release stays pressed for React Native's minimum time.
const touch = {
	persist: () => {},
	currentTarget: { measure: () => {} },
	nativeEvent: { changedTouches: [], touches: [], pageX: 0, pageY: 0 },
};

async function hold(label: string) {
	await fireEvent(
		screen.getByRole("button", { name: label }),
		"responderGrant",
		touch,
	);
}

async function release(label: string) {
	await fireEvent(
		screen.getByRole("button", { name: label }),
		"responderRelease",
		touch,
	);
	await act(() => jest.runOnlyPendingTimers());
}

function targetStyle(label: string) {
	return StyleSheet.flatten(
		screen.getByRole("button", { name: label }).props.style,
	);
}

function labelStyle(label: string) {
	return StyleSheet.flatten(screen.getByText(label).props.style);
}

describe("Button", () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it("presses the labelled button and ignores a disabled one", async () => {
		await render(<Consumer />);

		await fireEvent.press(screen.getByRole("button", { name: "Connect" }));

		expect(screen.getByText("Selected: Connect")).toBeOnTheScreen();
		const disabled = screen.getByRole("button", { name: "Check again" });
		expect(disabled.props.accessibilityState).toMatchObject({ disabled: true });

		await fireEvent.press(disabled);

		expect(screen.getByText("Selected: Connect")).toBeOnTheScreen();
	});

	it("shows the pressed fill while held and the resting fill after release", async () => {
		jest.useFakeTimers();
		await render(
			<>
				<Button variant="primary" label="Connect" onPress={jest.fn()} />
				<Button variant="secondary" label="Cancel" onPress={jest.fn()} />
				<Button variant="text" label="Retry" onPress={jest.fn()} />
			</>,
		);
		await hold("Connect");
		expect(targetStyle("Connect")).toMatchObject({
			backgroundColor: "#8C1427",
		});
		await release("Connect");
		expect(targetStyle("Connect")).toMatchObject({
			backgroundColor: "#D4213D",
		});

		await hold("Cancel");
		expect(targetStyle("Cancel")).toMatchObject({ backgroundColor: "#EEECE8" });
		await release("Cancel");
		expect(targetStyle("Cancel")).toMatchObject({ backgroundColor: "#FFFFFF" });

		await hold("Retry");
		expect(labelStyle("Retry")).toMatchObject({ color: "#8C1427" });
		await release("Retry");
		expect(labelStyle("Retry")).toMatchObject({ color: "#B01A31" });
	});

	it.each<[string, ButtonProps, object, object]>([
		[
			"primary regular",
			{ variant: "primary", label: "Go", onPress: () => {} },
			{
				minHeight: 54,
				minWidth: 44,
				borderRadius: 14,
				paddingHorizontal: 22,
				backgroundColor: "#D4213D",
				alignSelf: "flex-start",
			},
			{ color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
		],
		[
			"primary compact",
			{ variant: "primary", size: "compact", label: "Go", onPress: () => {} },
			{ minHeight: 44, minWidth: 44, borderRadius: 14 },
			{ fontSize: 15, fontFamily: "Inter_600SemiBold" },
		],
		[
			"secondary regular",
			{ variant: "secondary", label: "Go", onPress: () => {} },
			{
				minHeight: 54,
				minWidth: 44,
				borderRadius: 14,
				paddingHorizontal: 18,
				borderWidth: 1,
				borderColor: "#D9D6D0",
				backgroundColor: "#FFFFFF",
			},
			{ color: "#171717", fontSize: 16, fontFamily: "Inter_500Medium" },
		],
		[
			"secondary compact",
			{ variant: "secondary", size: "compact", label: "Go", onPress: () => {} },
			{ minHeight: 44, borderRadius: 12 },
			{ fontSize: 15, fontFamily: "Inter_500Medium" },
		],
		[
			"text",
			{ variant: "text", label: "Go", onPress: () => {} },
			{
				minHeight: 44,
				minWidth: 44,
				borderRadius: 12,
				paddingHorizontal: 8,
				backgroundColor: "transparent",
			},
			{ color: "#B01A31", fontSize: 15, fontFamily: "Inter_500Medium" },
		],
		[
			"disabled primary",
			{ variant: "primary", disabled: true, label: "Go", onPress: () => {} },
			{ backgroundColor: "#F6F5F2" },
			{ color: "#5C5C5C" },
		],
		[
			"disabled secondary",
			{ variant: "secondary", disabled: true, label: "Go", onPress: () => {} },
			{ backgroundColor: "#F6F5F2", borderWidth: 1, borderColor: "#D9D6D0" },
			{ color: "#5C5C5C" },
		],
		[
			"full width",
			{ variant: "primary", fullWidth: true, label: "Go", onPress: () => {} },
			{ alignSelf: "stretch" },
			{},
		],
	])(
		"lays out the variants with accessible targets: %s",
		async (_name, props, target, label) => {
			await render(<Button {...props} />);

			expect(targetStyle("Go")).toMatchObject(target);
			expect(labelStyle("Go")).toMatchObject(label);
		},
	);

	it("keeps the disabled fill while held", async () => {
		await render(
			<Button variant="primary" label="Go" disabled onPress={jest.fn()} />,
		);

		await hold("Go");

		expect(targetStyle("Go")).toMatchObject({ backgroundColor: "#F6F5F2" });
	});
});
