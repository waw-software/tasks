import type { LabelColor, ProjectColor } from "@waw/design-tokens";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { ColorSwatchPicker } from "./ColorSwatchPicker.tsx";

afterEach(() => {
	cleanup();
});

function group(name: string) {
	return within(screen.getByRole("group", { name }));
}

function radios(name: string): HTMLInputElement[] {
	return group(name).getAllByRole<HTMLInputElement>("radio");
}

function radio(groupName: string, name: string): HTMLInputElement {
	return group(groupName).getByRole<HTMLInputElement>("radio", { name });
}

function face(groupName: string, name: string): HTMLElement {
	return radio(groupName, name).nextElementSibling as HTMLElement;
}

function legend(name: string): string | undefined {
	return screen.getByRole("group", { name }).querySelector("legend")
		?.textContent;
}

function names(name: string): (string | null)[] {
	return radios(name).map((input) => input.getAttribute("aria-label"));
}

function Pickers(): React.JSX.Element {
	const [project, setProject] = useState<ProjectColor>("red");
	const [label, setLabel] = useState<LabelColor>("green");
	return (
		<>
			<ColorSwatchPicker
				label="Color"
				palette="project"
				value={project}
				onValueChange={setProject}
			/>
			<ColorSwatchPicker
				label="Label color"
				palette="label"
				value={label}
				onValueChange={setLabel}
			/>
		</>
	);
}

test("REQ-002: project and label palettes select by name", () => {
	const onValueChange = vi.fn();
	const project = (value: ProjectColor) => (
		<ColorSwatchPicker
			label="Color"
			palette="project"
			value={value}
			onValueChange={onValueChange}
		/>
	);
	const { rerender, unmount } = render(project("red"));
	expect(names("Color")).toEqual([
		"Red",
		"Blue",
		"Green",
		"Amber",
		"Violet",
		"Black",
	]);
	expect(radios("Color").map((input) => input.checked)).toEqual([
		true,
		false,
		false,
		false,
		false,
		false,
	]);
	expect(legend("Color")).toBe("Color · Red");
	expect(face("Color", "Blue").style.backgroundColor).toBe("rgb(31, 95, 191)");

	fireEvent.click(radio("Color", "Blue"));
	expect(onValueChange.mock.calls).toEqual([["blue"]]);
	rerender(project("blue"));
	expect(radio("Color", "Blue").checked).toBe(true);
	expect(radio("Color", "Red").checked).toBe(false);
	expect(legend("Color")).toBe("Color · Blue");
	// The tick marks the selection only: white on a project fill.
	expect(face("Color", "Red").querySelector("polyline")).toBeNull();
	expect(
		face("Color", "Blue").querySelector("polyline")?.getAttribute("stroke"),
	).toBe("#FFFFFF");
	unmount();

	render(<Pickers />);
	expect(names("Label color")).toEqual(["Green", "Blue", "Amber", "Violet"]);
	const blue = face("Label color", "Blue");
	expect(blue.style.backgroundColor).toBe("rgb(234, 241, 251)");
	expect(blue.style.border).toBe("1px solid rgb(31, 95, 191)");
	expect(radio("Color", "Red").name).not.toBe(
		radio("Label color", "Green").name,
	);

	fireEvent.click(radio("Label color", "Blue"));
	expect(radio("Label color", "Blue").checked).toBe(true);
	expect(radio("Label color", "Green").checked).toBe(false);
	expect(radio("Color", "Blue").checked).toBe(false);
	expect(radio("Color", "Red").checked).toBe(true);
	expect(legend("Label color")).toBe("Label color · Blue");
	expect(legend("Color")).toBe("Color · Red");
	expect(
		face("Label color", "Blue")
			.querySelector("polyline")
			?.getAttribute("stroke"),
	).toBe("#1F5FBF");
});

test("null selects nothing and shows no hue name", () => {
	render(
		<ColorSwatchPicker
			label="Color"
			palette="project"
			value={null}
			onValueChange={() => {}}
		/>,
	);
	expect(radios("Color").filter((input) => input.checked)).toEqual([]);
	expect(legend("Color")).toBe("Color");
});

test("REQ-002: every hue name is visible before any selection", () => {
	const onValueChange = vi.fn();
	render(
		<ColorSwatchPicker
			label="Color"
			palette="project"
			value={null}
			onValueChange={onValueChange}
		/>,
	);
	for (const name of ["Red", "Blue", "Green", "Amber", "Violet", "Black"]) {
		const text = screen.getByText(name);
		expect(text.closest("label")).toBe(radio("Color", name).closest("label"));
		expect([
			text.style.fontSize,
			text.style.fontWeight,
			text.style.color,
		]).toEqual(["12px", "400", "rgb(92, 92, 92)"]);
	}
	// Clicking the name selects, because it is part of the swatch label.
	fireEvent.click(screen.getByText("Amber"));
	expect(onValueChange.mock.calls).toEqual([["amber"]]);
});

test("swatches are 44 px targets", () => {
	render(<Pickers />);
	const all = screen.getAllByRole("radio");
	expect(all).toHaveLength(10);
	for (const input of all) {
		const { style } = input.nextElementSibling as HTMLElement;
		expect([style.width, style.height]).toEqual(["44px", "44px"]);
	}
});

test("passes the ring colours and sizes to the stylesheet", () => {
	render(<Pickers />);
	const { style } = screen.getByRole("group", { name: "Color" });
	expect(
		[
			"--waw-ring-gap",
			"--waw-ring",
			"--waw-ring-width",
			"--waw-hover",
			"--waw-focus",
			"--waw-focus-width",
			"--waw-focus-offset",
		].map((name) => style.getPropertyValue(name)),
	).toEqual(["#FFFFFF", "#171717", "2px", "#D9D6D0", "#B01A31", "2px", "6px"]);
});
