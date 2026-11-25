import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { ColorSwatchPicker } from "./ColorSwatchPicker";

const hidden = { includeHiddenElements: true };

const touch = {
	persist: () => {},
	currentTarget: { measure: () => {} },
	nativeEvent: { changedTouches: [], touches: [], pageX: 0, pageY: 0 },
};

function radio(name: string) {
	return screen.getByRole("radio", { name });
}

function styleOf(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID, hidden).props.style);
}

function names() {
	return screen
		.getAllByRole("radio")
		.map((node) => node.props.accessibilityLabel);
}

describe("ColorSwatchPicker", () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it("REQ-002: project and label palettes select by name", async () => {
		const onProject = jest.fn();
		const view = await render(
			<ColorSwatchPicker
				label="Color"
				palette="project"
				value="red"
				onValueChange={onProject}
			/>,
		);

		expect(names()).toEqual([
			"Red",
			"Blue",
			"Green",
			"Amber",
			"Violet",
			"Black",
		]);
		expect(radio("Red")).toBeChecked();
		expect(
			screen.getByRole("header", { name: "Color · Red" }),
		).toBeOnTheScreen();
		expect(styleOf("swatch-face-red")).toMatchObject({
			backgroundColor: "#D4213D",
		});

		await fireEvent.press(radio("Blue"));

		expect(onProject).toHaveBeenCalledTimes(1);
		expect(onProject).toHaveBeenLastCalledWith("blue");
		expect(radio("Red")).toBeChecked();

		await view.rerender(
			<ColorSwatchPicker
				label="Color"
				palette="project"
				value="blue"
				onValueChange={onProject}
			/>,
		);

		expect(radio("Blue")).toBeChecked();
		expect(radio("Red")).not.toBeChecked();
		expect(
			screen.getByRole("header", { name: "Color · Blue" }),
		).toBeOnTheScreen();
		expect(styleOf("swatch-face-blue")).toMatchObject({
			backgroundColor: "#1F5FBF",
		});
		expect(screen.queryByTestId("swatch-ring-red", hidden)).toBeNull();

		await fireEvent.press(radio("Blue"));

		expect(onProject).toHaveBeenCalledTimes(1);

		const onLabel = jest.fn();
		await view.rerender(
			<ColorSwatchPicker
				label="Label color"
				palette="label"
				value="green"
				onValueChange={onLabel}
			/>,
		);

		expect(names()).toEqual(["Green", "Blue", "Amber", "Violet"]);
		expect(radio("Green")).toBeChecked();
		expect(
			screen.getByRole("header", { name: "Label color · Green" }),
		).toBeOnTheScreen();
		expect(styleOf("swatch-face-blue")).toMatchObject({
			backgroundColor: "#EAF1FB",
			borderWidth: 1,
			borderColor: "#1F5FBF",
		});

		await fireEvent.press(radio("Blue"));

		expect(onLabel).toHaveBeenLastCalledWith("blue");
	});

	it("REQ-002: every swatch shows its name before any selection", async () => {
		await render(
			<ColorSwatchPicker
				label="Color"
				palette="project"
				value={null}
				onValueChange={jest.fn()}
			/>,
		);

		for (const name of ["Red", "Blue", "Green", "Amber", "Violet", "Black"]) {
			expect(screen.getByText(name)).toBeVisible();
			expect(
				StyleSheet.flatten(screen.getByText(name).props.style),
			).toMatchObject({
				fontFamily: "Inter_400Regular",
				fontSize: 12,
				color: "#5C5C5C",
				textAlign: "center",
			});
		}
	});

	it("shows a hidden ring and tick on the selected 44 point swatch", async () => {
		const view = await render(
			<ColorSwatchPicker
				label="Color"
				palette="project"
				value="blue"
				onValueChange={jest.fn()}
			/>,
		);

		for (const name of names()) {
			expect(StyleSheet.flatten(radio(name).props.style)).toMatchObject({
				minWidth: 44,
				minHeight: 44,
			});
			expect(styleOf(`swatch-circle-${name.toLowerCase()}`)).toMatchObject({
				width: 44,
				height: 44,
			});
		}
		expect(styleOf("swatch-ring-blue")).toMatchObject({
			position: "absolute",
			top: -4,
			right: -4,
			bottom: -4,
			left: -4,
			borderWidth: 2,
			borderColor: "#171717",
		});
		expect(styleOf("swatch-gap-blue")).toMatchObject({
			borderWidth: 2,
			borderColor: "#FFFFFF",
		});
		expect(
			screen.getByTestId("swatch-ring-blue", hidden).props.pointerEvents,
		).toBe("none");
		expect(screen.queryByTestId("swatch-ring-blue")).toBeNull();
		expect(styleOf("swatch-tick-blue")).toMatchObject({
			width: 16,
			height: 16,
		});
		expect(styleOf("swatch-tick-shape-blue")).toMatchObject({
			borderColor: "#FFFFFF",
		});
		expect(screen.queryByTestId("swatch-tick-blue")).toBeNull();

		await view.rerender(
			<ColorSwatchPicker
				label="Label color"
				palette="label"
				value="amber"
				onValueChange={jest.fn()}
			/>,
		);

		expect(styleOf("swatch-tick-shape-amber")).toMatchObject({
			borderColor: "#8A5A00",
		});
	});

	it("null selects nothing and names no hue", async () => {
		await render(
			<ColorSwatchPicker
				label="Color"
				palette="project"
				value={null}
				onValueChange={jest.fn()}
			/>,
		);

		expect(screen.getByRole("header", { name: "Color" })).toBeOnTheScreen();
		expect(screen.queryAllByRole("radio", { checked: true })).toHaveLength(0);
		expect(screen.queryAllByTestId(/^swatch-(ring|tick)-/, hidden)).toEqual([]);
		expect(screen.getByLabelText("Color").props.accessibilityRole).toBe(
			"radiogroup",
		);
	});

	it("adds a muted edge while held and drops it after release", async () => {
		jest.useFakeTimers();
		await render(
			<ColorSwatchPicker
				label="Color"
				palette="project"
				value={null}
				onValueChange={jest.fn()}
			/>,
		);

		await fireEvent(radio("Green"), "responderGrant", touch);

		expect(styleOf("swatch-face-green")).toMatchObject({
			borderWidth: 2,
			borderColor: "#5C5C5C",
		});

		await fireEvent(radio("Green"), "responderRelease", touch);
		await act(() => jest.runOnlyPendingTimers());

		expect(styleOf("swatch-face-green").borderWidth).toBeUndefined();
	});
});
