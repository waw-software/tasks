import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SegmentedChoice } from "./SegmentedChoice.tsx";

afterEach(() => {
	cleanup();
});

const priorities = [
	{ value: 1, label: "P1", priority: 1 },
	{ value: 2, label: "P2", priority: 2 },
	{ value: 3, label: "P3", priority: 3 },
	{ value: 4, label: "P4", priority: 4 },
] as const;

const helper = "P1 tasks rise to the top of Today. P4 is the default.";

function radio(name: string): HTMLInputElement {
	return screen.getByRole<HTMLInputElement>("radio", { name });
}

function card(name: string): HTMLElement {
	return radio(name).nextElementSibling as HTMLElement;
}

function paint(name: string) {
	const { style } = card(name);
	return {
		edge: style.borderColor,
		width: style.borderWidth,
		line: style.borderStyle,
		bg: style.backgroundColor,
		ink: style.color,
	};
}

test("REQ-002 AC-10 presentation: priority control selects P2 and describes the group", () => {
	const onValueChange = vi.fn();
	const control = (value: number) => (
		<SegmentedChoice<number>
			label="Priority"
			options={priorities}
			value={value}
			onValueChange={onValueChange}
			helperText={helper}
		/>
	);
	const { rerender } = render(control(1));

	const group = screen.getByRole("group", { name: "Priority" });
	expect(group.tagName).toBe("FIELDSET");
	expect(group.querySelector("legend")?.textContent).toBe("Priority");
	const describedBy = group.getAttribute("aria-describedby") ?? "";
	expect(document.getElementById(describedBy)?.textContent).toBe(helper);
	expect(radio("P1").checked).toBe(true);

	fireEvent.click(radio("P2"));
	expect(onValueChange.mock.calls).toEqual([[2]]);
	// Controlled: the selection moves only when the caller moves it.
	expect(radio("P1").checked).toBe(true);

	rerender(control(2));
	expect(radio("P2").checked).toBe(true);
	expect(radio("P1").checked).toBe(false);
	expect(paint("P2")).toEqual({
		edge: "rgb(138, 90, 0)",
		width: "2px",
		line: "solid",
		bg: "rgb(251, 243, 226)",
		ink: "rgb(138, 90, 0)",
	});
	// An idle card leaves its fill to the stylesheet, so hover and press can paint.
	expect(paint("P1")).toEqual({
		edge: "rgb(92, 92, 92)",
		width: "1px",
		line: "solid",
		bg: "",
		ink: "rgb(176, 26, 49)",
	});
});

test.each([
	[1, "P1", "rgb(176, 26, 49)", "rgb(252, 235, 238)"],
	[3, "P3", "rgb(31, 95, 191)", "rgb(234, 241, 251)"],
	[4, "P4", "rgb(92, 92, 92)", "rgb(246, 245, 242)"],
])(
	"REQ-002: selected priority %i uses its ink and fill",
	(value, name, ink, bg) => {
		render(
			<SegmentedChoice<number>
				label="Priority"
				options={priorities}
				value={value}
				onValueChange={() => {}}
			/>,
		);
		expect(paint(name)).toEqual({
			edge: ink,
			width: "2px",
			line: "solid",
			bg,
			ink,
		});
	},
);

test("a neutral selection reverses ink and background, and cards are 44 px targets", () => {
	render(
		<SegmentedChoice
			label="View"
			options={[
				{ value: "list", label: "List" },
				{ value: "board", label: "Board" },
			]}
			value="list"
			onValueChange={() => {}}
		/>,
	);
	expect(paint("List")).toEqual({
		edge: "rgb(23, 23, 23)",
		width: "2px",
		line: "solid",
		bg: "rgb(23, 23, 23)",
		ink: "rgb(255, 255, 255)",
	});
	expect(paint("Board").ink).toBe("rgb(23, 23, 23)");
	expect(card("Board").style.minHeight).toBe("44px");
	expect(card("Board").style.borderRadius).toBe("12px");
	expect(
		screen
			.getByRole("group", { name: "View" })
			.getAttribute("aria-describedby"),
	).toBeNull();
});

test("null selects nothing and a disabled option is inert", () => {
	const onValueChange = vi.fn();
	render(
		<SegmentedChoice
			label="View"
			options={[
				{ value: "list", label: "List" },
				{ value: "board", label: "Board", disabled: true },
			]}
			value={null}
			onValueChange={onValueChange}
		/>,
	);
	expect(radio("List").checked).toBe(false);
	expect(radio("Board").checked).toBe(false);
	expect(radio("Board").disabled).toBe(true);
	// Not fireEvent: jsdom runs a dispatched click on a disabled radio, while
	// click() does nothing, as in a browser.
	radio("Board").click();
	expect(onValueChange).not.toHaveBeenCalled();
	// The same call does reach an enabled option.
	radio("List").click();
	expect(onValueChange.mock.calls).toEqual([["list"]]);
	expect(paint("Board")).toEqual({
		edge: "rgb(217, 214, 208)",
		width: "1px",
		line: "dashed",
		bg: "rgb(246, 245, 242)",
		ink: "rgb(92, 92, 92)",
	});
});

test("a disabled selection stays distinguishable", () => {
	render(
		<SegmentedChoice
			label="View"
			options={[{ value: "list", label: "List", disabled: true }]}
			value="list"
			onValueChange={() => {}}
		/>,
	);
	expect(radio("List").checked).toBe(true);
	expect(paint("List")).toEqual({
		edge: "rgb(23, 23, 23)",
		width: "2px",
		line: "dashed",
		bg: "rgb(246, 245, 242)",
		ink: "rgb(92, 92, 92)",
	});
});

test("two controls do not share a radio group", () => {
	const control = (label: string) => (
		<SegmentedChoice
			label={label}
			options={[{ value: "a", label }]}
			value="a"
			onValueChange={() => {}}
		/>
	);
	render(
		<>
			{control("First")}
			{control("Second")}
		</>,
	);
	expect(radio("First").name).not.toBe(radio("Second").name);
	expect(radio("First").checked).toBe(true);
	expect(radio("Second").checked).toBe(true);
});
