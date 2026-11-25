import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SegmentedChoice } from "./SegmentedChoice";

const options = [
	{ value: 1, label: "P1", priority: 1 },
	{ value: 2, label: "P2", priority: 2 },
	{ value: 3, label: "P3", priority: 3 },
	{ value: 4, label: "P4", priority: 4 },
] as const;

const hidden = { includeHiddenElements: true };

const touch = {
	persist: () => {},
	currentTarget: { measure: () => {} },
	nativeEvent: { changedTouches: [], touches: [], pageX: 0, pageY: 0 },
};

function radio(name: string) {
	return screen.getByRole("radio", { name });
}

function styleOf(name: string) {
	return StyleSheet.flatten(radio(name).props.style);
}

function textStyle(text: string) {
	return StyleSheet.flatten(screen.getByText(text).props.style);
}

async function hold(name: string) {
	await fireEvent(radio(name), "responderGrant", touch);
}

async function release(name: string) {
	await fireEvent(radio(name), "responderRelease", touch);
	await act(() => jest.runOnlyPendingTimers());
}

describe("SegmentedChoice", () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it("REQ-002 AC-10 presentation: priority control selects P2", async () => {
		const onValueChange = jest.fn();
		const element = (value: number) => (
			<SegmentedChoice
				label="Priority"
				helperText="P1 tasks rise to the top of Today. P4 is the default."
				options={options}
				value={value}
				onValueChange={onValueChange}
			/>
		);
		const view = await render(element(1));

		expect(screen.getByRole("header", { name: "Priority" })).toBeOnTheScreen();
		expect(
			screen.getByText("P1 tasks rise to the top of Today. P4 is the default."),
		).toBeOnTheScreen();
		expect(screen.getByLabelText("Priority").props.accessibilityRole).toBe(
			"radiogroup",
		);
		expect(screen.getAllByRole("radio")).toHaveLength(4);
		expect(radio("P1")).toBeChecked();

		await fireEvent.press(radio("P2"));

		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(onValueChange).toHaveBeenLastCalledWith(2);
		expect(radio("P1")).toBeChecked();

		await view.rerender(element(2));

		expect(radio("P2")).toBeChecked();
		expect(radio("P1")).not.toBeChecked();
		expect(styleOf("P2")).toMatchObject({
			borderWidth: 2,
			borderColor: "#8A5A00",
			backgroundColor: "#FBF3E2",
			minHeight: 72,
			borderRadius: 14,
			flex: 1,
		});
		expect(styleOf("P1")).toMatchObject({
			borderWidth: 1,
			borderColor: "#5C5C5C",
			backgroundColor: "#FFFFFF",
		});
		expect(textStyle("P1")).toMatchObject({
			color: "#B01A31",
			fontSize: 14,
			fontFamily: "Inter_600SemiBold",
		});
		expect(screen.queryAllByTestId("segment-flag", hidden)).toHaveLength(4);
		expect(screen.queryAllByTestId("segment-flag")).toHaveLength(0);

		await fireEvent.press(radio("P2"));

		expect(onValueChange).toHaveBeenCalledTimes(1);
	});

	it.each([
		[1, "P1", "#B01A31", "#FCEBEE"],
		[3, "P3", "#1F5FBF", "#EAF1FB"],
		[4, "P4", "#5C5C5C", "#F6F5F2"],
	])(
		"fills the selected priority %s card",
		async (value, name, ink, backgroundColor) => {
			await render(
				<SegmentedChoice
					label="Priority"
					options={options}
					value={value}
					onValueChange={jest.fn()}
				/>,
			);

			expect(styleOf(name)).toMatchObject({
				borderWidth: 2,
				borderColor: ink,
				backgroundColor,
			});
		},
	);

	it("reverses ink and background on a selected neutral card", async () => {
		await render(
			<SegmentedChoice
				label="View"
				options={[
					{ value: "list", label: "List" },
					{ value: "board", label: "Board" },
				]}
				value="list"
				onValueChange={jest.fn()}
			/>,
		);

		expect(styleOf("List")).toMatchObject({
			borderColor: "#171717",
			backgroundColor: "#171717",
		});
		expect(textStyle("List")).toMatchObject({ color: "#FFFFFF" });
		expect(textStyle("Board")).toMatchObject({ color: "#171717" });
		expect(screen.queryAllByTestId("segment-flag", hidden)).toHaveLength(0);
	});

	it("null selects nothing, disabled is inert, pressed shows divider", async () => {
		jest.useFakeTimers();
		const onValueChange = jest.fn();
		await render(
			<SegmentedChoice
				label="Priority"
				options={[options[0], { ...options[1], disabled: true }]}
				value={null}
				onValueChange={onValueChange}
			/>,
		);

		expect(radio("P1")).not.toBeChecked();
		expect(radio("P2")).not.toBeChecked();
		expect(radio("P2").props.accessibilityState).toMatchObject({
			disabled: true,
		});
		expect(styleOf("P2")).toMatchObject({
			borderStyle: "dashed",
			borderColor: "#D9D6D0",
			backgroundColor: "#F6F5F2",
		});
		expect(textStyle("P2")).toMatchObject({ color: "#5C5C5C" });

		await fireEvent.press(radio("P2"));
		await hold("P2");

		expect(onValueChange).not.toHaveBeenCalled();
		expect(styleOf("P2")).toMatchObject({ backgroundColor: "#F6F5F2" });

		await hold("P1");
		expect(styleOf("P1")).toMatchObject({ backgroundColor: "#EEECE8" });
		await release("P1");
		expect(styleOf("P1")).toMatchObject({ backgroundColor: "#FFFFFF" });
	});

	it("keeps a disabled selection distinct and a held selection filled", async () => {
		await render(
			<SegmentedChoice
				label="Priority"
				options={[options[0], { ...options[1], disabled: true }]}
				value={2}
				onValueChange={jest.fn()}
			/>,
		);

		expect(radio("P2")).toBeChecked();
		expect(styleOf("P2")).toMatchObject({
			borderWidth: 2,
			borderStyle: "dashed",
			borderColor: "#8A5A00",
			backgroundColor: "#F6F5F2",
		});
	});

	it("keeps the selected fill while held", async () => {
		await render(
			<SegmentedChoice
				label="Priority"
				options={options}
				value={1}
				onValueChange={jest.fn()}
			/>,
		);

		await hold("P1");

		expect(styleOf("P1")).toMatchObject({ backgroundColor: "#FCEBEE" });
	});

	it("shows the label without a row when there are no options", async () => {
		await render(
			<SegmentedChoice
				label="Priority"
				options={[]}
				value={null}
				onValueChange={jest.fn()}
			/>,
		);

		expect(screen.getByRole("header", { name: "Priority" })).toBeOnTheScreen();
		expect(screen.queryByLabelText("Priority", hidden)).toBeNull();
	});
});
