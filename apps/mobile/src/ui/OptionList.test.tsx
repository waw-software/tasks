import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { OptionList } from "./OptionList";

const reminders = [
	{ value: "at-time", label: "At the time of the task" },
	{ value: "ten-minutes", label: "10 minutes before" },
	{ value: "day-before", label: "1 day before" },
];

const repeats = [
	{ value: "never", label: "Never" },
	{ value: "daily", label: "Every day" },
	{ value: "weekly", label: "Every week on Sunday" },
	{ value: "monthly", label: "Every month on the 1st" },
	{ value: "custom", label: "Custom" },
];

// Pressable's host view only has responder handlers, so a held press is a
// responder grant; its release stays pressed for React Native's minimum time.
const touch = {
	persist: () => {},
	currentTarget: { measure: () => {} },
	nativeEvent: { changedTouches: [], touches: [], pageX: 0, pageY: 0 },
};

describe("OptionList", () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it("REQ-003 AC-14: reminder checkboxes keep every selected reminder", async () => {
		const onValueChange = jest.fn();
		const list = (value: string[]) => (
			<OptionList
				mode="multiple"
				label="Remind me"
				options={reminders}
				value={value}
				onValueChange={onValueChange}
			/>
		);
		const view = await render(list(["at-time", "day-before"]));

		expect(screen.getAllByRole("checkbox")).toHaveLength(3);
		for (const row of screen.getAllByRole("checkbox")) {
			expect(row.props.accessibilityHint).toBe("Remind me");
		}
		expect(screen.queryByRole("radio")).toBeNull();
		expect(
			screen.getByLabelText("Remind me").props.accessibilityRole,
		).toBeUndefined();
		expect(
			screen.getByRole("checkbox", { name: "At the time of the task" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "10 minutes before" }),
		).not.toBeChecked();

		await fireEvent.press(
			screen.getByRole("checkbox", { name: "10 minutes before" }),
		);
		expect(onValueChange).toHaveBeenLastCalledWith([
			"at-time",
			"day-before",
			"ten-minutes",
		]);

		await view.rerender(list(["at-time", "day-before", "ten-minutes"]));
		await fireEvent.press(
			screen.getByRole("checkbox", { name: "1 day before" }),
		);
		expect(onValueChange).toHaveBeenLastCalledWith(["at-time", "ten-minutes"]);

		await view.rerender(list(["custom-1", "at-time"]));
		await fireEvent.press(
			screen.getByRole("checkbox", { name: "1 day before" }),
		);
		expect(onValueChange).toHaveBeenLastCalledWith([
			"custom-1",
			"at-time",
			"day-before",
		]);

		await fireEvent.press(
			screen.getByRole("checkbox", { name: "At the time of the task" }),
		);
		expect(onValueChange).toHaveBeenLastCalledWith(["custom-1"]);
		expect(onValueChange).toHaveBeenCalledTimes(4);
	});

	it("REQ-003 AC-13 presentation: repeat radios replace the selection", async () => {
		const onValueChange = jest.fn();
		const list = (value: string) => (
			<OptionList
				mode="single"
				label="Repeat"
				helperText="Next one appears after you complete this one: Tue 1 Dec, 09:00."
				options={repeats}
				value={value}
				onValueChange={onValueChange}
			/>
		);
		const view = await render(list("monthly"));

		expect(screen.getByRole("header", { name: "Repeat" })).toBeOnTheScreen();
		expect(
			screen.getByText(
				"Next one appears after you complete this one: Tue 1 Dec, 09:00.",
			),
		).toBeOnTheScreen();
		expect(screen.getByLabelText("Repeat").props.accessibilityRole).toBe(
			"radiogroup",
		);
		expect(screen.getAllByRole("radio")).toHaveLength(5);
		for (const row of screen.getAllByRole("radio")) {
			expect(row.props.accessibilityHint).toBe("Repeat");
		}
		expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
		expect(
			screen.getByRole("radio", { name: "Every month on the 1st" }),
		).toBeChecked();

		await fireEvent.press(screen.getByRole("radio", { name: "Every day" }));
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith("daily");

		await view.rerender(list("daily"));
		expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
		expect(screen.getByRole("radio", { name: "Every day" })).toBeChecked();
	});

	it("label rows show their detail and a separate action", async () => {
		const onValueChange = jest.fn();
		const onPress = jest.fn();
		const view = await render(
			<OptionList
				mode="multiple"
				label="Labels"
				options={[
					{
						value: "money",
						label: "@money",
						detail: "6 tasks",
						labelColor: "green",
					},
					{
						value: "calls",
						label: "@calls",
						detail: "3 tasks",
						labelColor: "blue",
						disabled: true,
					},
				]}
				value={["money"]}
				onValueChange={onValueChange}
				action={{ label: "New label", onPress }}
			/>,
		);

		expect(
			screen.getByRole("checkbox", { name: "@money, 6 tasks" }),
		).toBeChecked();
		expect(screen.getByText("6 tasks")).toHaveStyle({
			fontSize: 13,
			color: "#5C5C5C",
		});
		expect(screen.getByText("@money")).toHaveStyle({ color: "#1B6943" });

		const disabled = screen.getByRole("checkbox", { name: "@calls, 3 tasks" });
		expect(disabled).toBeDisabled();
		await fireEvent.press(disabled);
		expect(onValueChange).not.toHaveBeenCalled();

		const action = screen.getByRole("button", { name: "New label" });
		expect(
			screen
				.getByLabelText("Labels")
				.queryAll((node) => node.props.accessibilityRole === "button"),
		).toHaveLength(0);
		expect(StyleSheet.flatten(action.props.style)).toMatchObject({
			minHeight: 50,
		});
		await fireEvent.press(action);
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(onValueChange).not.toHaveBeenCalled();

		await view.rerender(
			<OptionList
				mode="multiple"
				label="Labels"
				options={[]}
				value={[]}
				onValueChange={onValueChange}
				action={{ label: "New label", onPress }}
			/>,
		);
		expect(screen.queryByRole("checkbox")).toBeNull();
		await fireEvent.press(screen.getByRole("button", { name: "New label" }));
		expect(onPress).toHaveBeenCalledTimes(2);
	});

	it("REQ-003 AC-14: a selected reminder survives its option being filtered out", async () => {
		const onValueChange = jest.fn();
		const list = (options: typeof reminders) => (
			<OptionList
				mode="multiple"
				label="Remind me"
				options={options}
				value={["at-time", "day-before"]}
				onValueChange={onValueChange}
			/>
		);
		const view = await render(list(reminders));

		await view.rerender(
			list([{ value: "ten-minutes", label: "10 minutes before" }]),
		);
		expect(screen.queryByRole("checkbox", { name: "1 day before" })).toBeNull();
		await fireEvent.press(
			screen.getByRole("checkbox", { name: "10 minutes before" }),
		);
		expect(onValueChange).toHaveBeenLastCalledWith([
			"at-time",
			"day-before",
			"ten-minutes",
		]);

		await view.rerender(list(reminders));
		expect(
			screen.getByRole("checkbox", { name: "1 day before" }),
		).toBeChecked();
		expect(
			screen.getByRole("checkbox", { name: "At the time of the task" }),
		).toBeChecked();
		expect(onValueChange).toHaveBeenCalledTimes(1);
	});

	it("a held row shows the pressed fill", async () => {
		jest.useFakeTimers();
		await render(
			<OptionList
				mode="single"
				label="Repeat"
				options={repeats}
				value="monthly"
				onValueChange={jest.fn()}
			/>,
		);
		const row = () => screen.getByTestId("option-daily");
		const fill = () => StyleSheet.flatten(row().props.style);

		await fireEvent(row(), "responderGrant", touch);
		expect(fill()).toMatchObject({ backgroundColor: "#EEECE8" });

		await fireEvent(row(), "responderRelease", touch);
		await act(() => jest.runOnlyPendingTimers());
		expect(fill()).toMatchObject({ backgroundColor: "#FFFFFF" });
	});
});
