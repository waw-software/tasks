import { theme } from "@waw/design-tokens";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import Gallery from "./Gallery";

describe("Gallery", () => {
	it("gallery names each project hue next to a decorative marker", async () => {
		await render(<Gallery onBack={jest.fn()} />);

		for (const name of [
			"Home",
			"Work",
			"Personal",
			"Errands",
			"Reading",
			"Archive",
		]) {
			expect(screen.getByText(name)).toBeOnTheScreen();
		}
		for (const color of ["red", "blue", "green", "amber", "violet", "black"]) {
			const id = `marker-${color}`;
			expect(
				screen.getByTestId(id, { includeHiddenElements: true }),
			).toBeOnTheScreen();
			expect(screen.queryByTestId(id)).toBeNull();
		}
		const red = screen.getByTestId("marker-red", {
			includeHiddenElements: true,
		});
		expect(StyleSheet.flatten(red.props.style)).toMatchObject({
			width: 8,
			height: 8,
			borderRadius: 3,
			backgroundColor: theme.project.red,
		});
	});

	it("gallery shows the four label chips on bg and on surface", async () => {
		await render(<Gallery onBack={jest.fn()} />);

		for (const name of ["@money", "@calls", "@waiting", "@errands"]) {
			expect(screen.getAllByText(name)).toHaveLength(2);
		}
		const [onBg, onSurface] = screen.getAllByText("@waiting");
		expect(onBg).toHaveStyle({ color: theme.label.amber.ink });
		expect(onSurface).toHaveStyle({ color: theme.label.amber.surfaceInk });
	});

	it("group headers show the count when given, 0 included", async () => {
		await render(<Gallery onBack={jest.fn()} />);

		for (const name of ["OVERDUE 1", "TODAY 3", "TODAY 0", "SOMEDAY"]) {
			expect(screen.getByRole("header", { name })).toBeOnTheScreen();
		}
		expect(screen.getByRole("header", { name: "OVERDUE 1" })).toHaveStyle({
			color: theme.color["accent-text"],
		});
		expect(screen.getByRole("header", { name: "TODAY 3" })).toHaveStyle({
			color: theme.color.muted,
		});
	});

	it("progress bars expose done of total and hide a zero total", async () => {
		await render(<Gallery onBack={jest.fn()} />);

		const bars = screen.getAllByRole("progressbar", { name: "Tasks done" });
		expect(bars).toHaveLength(3);
		expect(bars.map((bar) => bar.props.accessibilityValue)).toEqual([
			{ min: 0, max: 7, now: 0 },
			{ min: 0, max: 7, now: 2 },
			{ min: 0, max: 7, now: 7 },
		]);
		expect(screen.getByText("2 of 7 done")).toBeOnTheScreen();
		expect(screen.queryByText("0 of 0 done")).toBeNull();
	});

	it("Back calls onBack", async () => {
		const onBack = jest.fn();
		await render(<Gallery onBack={onBack} />);

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(onBack).toHaveBeenCalledTimes(1);
	});
});
