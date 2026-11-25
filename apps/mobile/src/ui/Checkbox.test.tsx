import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Checkbox } from "./Checkbox";

const hidden = { includeHiddenElements: true };

function styleOf(testID: string) {
	return StyleSheet.flatten(screen.getByTestId(testID, hidden).props.style);
}

describe("Checkbox", () => {
	it("a named controlled checkbox emits the next value and follows its prop", async () => {
		const onCheckedChange = jest.fn();
		const view = await render(
			<Checkbox
				checked={false}
				label="Pay rent"
				onCheckedChange={onCheckedChange}
			/>,
		);
		const box = () => screen.getByRole("checkbox", { name: "Pay rent" });
		expect(box()).not.toBeChecked();

		await fireEvent.press(box());

		expect(onCheckedChange).toHaveBeenLastCalledWith(true);
		expect(box()).not.toBeChecked();

		await view.rerender(
			<Checkbox checked label="Pay rent" onCheckedChange={onCheckedChange} />,
		);
		expect(box()).toBeChecked();

		await fireEvent.press(box());

		expect(onCheckedChange).toHaveBeenLastCalledWith(false);
		expect(onCheckedChange).toHaveBeenCalledTimes(2);
		expect(box()).toBeChecked();
	});

	it("uses a 44 point target and a 22 point face", async () => {
		const view = await render(
			<Checkbox checked={false} label="Pay rent" onCheckedChange={jest.fn()} />,
		);

		expect(styleOf("checkbox-target")).toMatchObject({
			width: 44,
			height: 44,
		});
		expect(styleOf("checkbox-face")).toMatchObject({
			width: 22,
			height: 22,
			borderRadius: 3,
			borderWidth: 1,
			borderColor: "#5C5C5C",
			backgroundColor: "#FFFFFF",
		});
		expect(screen.queryByTestId("checkbox-tick", hidden)).toBeNull();

		await view.rerender(
			<Checkbox checked label="Pay rent" onCheckedChange={jest.fn()} />,
		);

		expect(styleOf("checkbox-face")).toMatchObject({
			borderColor: "#171717",
			backgroundColor: "#171717",
		});
		expect(screen.getByTestId("checkbox-tick", hidden)).toBeOnTheScreen();
		expect(screen.queryByTestId("checkbox-tick")).toBeNull();
	});
});
