import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { type TabId, TabBar } from "./TabBar";

function Consumer({ onTabChange }: { onTabChange: (tab: TabId) => void }) {
	const [activeTab, setActiveTab] = useState<TabId>("today");
	return (
		<TabBar
			activeTab={activeTab}
			onTabChange={(tab) => {
				onTabChange(tab);
				setActiveTab(tab);
			}}
		/>
	);
}

function AddConsumer({ onTabChange }: { onTabChange: (tab: TabId) => void }) {
	const [added, setAdded] = useState(0);
	return (
		<>
			<Text>{`Added: ${added}`}</Text>
			<TabBar
				activeTab="today"
				onTabChange={onTabChange}
				onAdd={() => setAdded((count) => count + 1)}
			/>
		</>
	);
}

function buttonNames() {
	return screen
		.getAllByRole("button")
		.map((button) => button.props.accessibilityLabel);
}

function selectedNames() {
	return screen
		.getAllByRole("button")
		.filter((button) => button.props.accessibilityState?.selected === true)
		.map((button) => button.props.accessibilityLabel);
}

function targetStyle(name: string) {
	return StyleSheet.flatten(screen.getByRole("button", { name }).props.style);
}

// Pressable's host view only has responder handlers, so a held press is a
// responder grant; its release stays pressed for React Native's minimum time.
const touch = {
	persist: () => {},
	currentTarget: { measure: () => {} },
	nativeEvent: { changedTouches: [], touches: [], pageX: 0, pageY: 0 },
};

describe("TabBar", () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it("REQ-004: main navigation switches from Today to Browse", async () => {
		const onTabChange = jest.fn();
		await render(<Consumer onTabChange={onTabChange} />);

		expect(buttonNames()).toEqual(["Today", "Upcoming", "Search", "Browse"]);
		expect(selectedNames()).toEqual(["Today"]);

		await fireEvent.press(screen.getByRole("button", { name: "Browse" }));

		expect(onTabChange).toHaveBeenCalledWith("browse");
		expect(selectedNames()).toEqual(["Browse"]);
		expect(StyleSheet.flatten(screen.getByText("Browse").props.style)).toEqual(
			expect.objectContaining({
				color: "#D4213D",
				fontFamily: "Inter_600SemiBold",
				fontSize: 11,
			}),
		);
		expect(StyleSheet.flatten(screen.getByText("Today").props.style)).toEqual(
			expect.objectContaining({
				color: "#5C5C5C",
				fontFamily: "Inter_500Medium",
				fontSize: 11,
			}),
		);
	});

	it("REQ-005: Add task is a separate named action", async () => {
		const onTabChange = jest.fn();
		const { rerender } = await render(
			<AddConsumer onTabChange={onTabChange} />,
		);

		await fireEvent.press(screen.getByRole("button", { name: "Add task" }));

		expect(screen.getByText("Added: 1")).toBeOnTheScreen();
		expect(onTabChange).not.toHaveBeenCalled();
		expect(selectedNames()).toEqual(["Today"]);

		await rerender(<TabBar activeTab="browse" onTabChange={onTabChange} />);

		expect(screen.queryByRole("button", { name: "Add task" })).toBeNull();
	});

	it("sizes and pressed colour", async () => {
		jest.useFakeTimers();
		const { rerender } = await render(
			<TabBar activeTab="today" onTabChange={jest.fn()} onAdd={jest.fn()} />,
		);

		expect(buttonNames()).toHaveLength(5);
		for (const name of ["Today", "Upcoming", "Search", "Browse"]) {
			expect(targetStyle(name)).toMatchObject({ flex: 1, minHeight: 52 });
		}
		expect(targetStyle("Add task")).toMatchObject({
			width: 56,
			height: 56,
			borderRadius: 18,
			backgroundColor: "#D4213D",
		});

		await fireEvent(
			screen.getByRole("button", { name: "Add task" }),
			"responderGrant",
			touch,
		);
		expect(targetStyle("Add task")).toMatchObject({
			backgroundColor: "#8C1427",
		});
		await fireEvent(
			screen.getByRole("button", { name: "Add task" }),
			"responderRelease",
			touch,
		);
		await act(() => jest.runOnlyPendingTimers());
		expect(targetStyle("Add task")).toMatchObject({
			backgroundColor: "#D4213D",
		});

		await rerender(<TabBar activeTab="today" onTabChange={jest.fn()} />);

		expect(buttonNames()).toHaveLength(4);
	});
});
