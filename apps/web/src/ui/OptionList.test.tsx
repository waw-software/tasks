import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { type ListOption, OptionList } from "./OptionList.tsx";

afterEach(() => {
	cleanup();
});

type Reminder = "at-time" | "ten-minutes" | "day-before" | "custom-1";

const reminders: ListOption<Reminder>[] = [
	{ value: "at-time", label: "At the time of the task" },
	{ value: "ten-minutes", label: "10 minutes before" },
	{ value: "day-before", label: "1 day before" },
];

function checkbox(name: string): HTMLInputElement {
	return screen.getByRole<HTMLInputElement>("checkbox", { name });
}

test("REQ-003 AC-14: reminder checkboxes keep every selected reminder", () => {
	const onValueChange = vi.fn();
	const list = (value: Reminder[]) => (
		<OptionList
			mode="multiple"
			label="Remind me"
			options={reminders}
			value={value}
			onValueChange={onValueChange}
		/>
	);
	const { rerender } = render(list(["at-time", "day-before"]));

	fireEvent.click(checkbox("10 minutes before"));
	expect(onValueChange).toHaveBeenLastCalledWith([
		"at-time",
		"day-before",
		"ten-minutes",
	]);

	rerender(list(["at-time", "day-before", "ten-minutes"]));
	for (const { label } of reminders) {
		expect(checkbox(label).checked).toBe(true);
	}
	fireEvent.click(checkbox("1 day before"));
	expect(onValueChange).toHaveBeenLastCalledWith(["at-time", "ten-minutes"]);

	rerender(list(["custom-1", "at-time"]));
	fireEvent.click(checkbox("10 minutes before"));
	expect(onValueChange).toHaveBeenLastCalledWith([
		"custom-1",
		"at-time",
		"ten-minutes",
	]);
	fireEvent.click(checkbox("At the time of the task"));
	expect(onValueChange).toHaveBeenLastCalledWith(["custom-1"]);
	expect(onValueChange).toHaveBeenCalledTimes(4);
});

test("REQ-003 AC-13 presentation: repeat radios replace the selection", () => {
	const onValueChange = vi.fn();
	const helper =
		"Next one appears after you complete this one: Tue 1 Dec, 09:00.";
	render(
		<OptionList
			mode="single"
			label="Repeat"
			helperText={helper}
			options={[
				{ value: "never", label: "Never" },
				{ value: "daily", label: "Every day" },
				{ value: "weekly", label: "Every week on Sunday" },
				{ value: "monthly", label: "Every month on the 1st" },
				{ value: "custom", label: "Custom" },
			]}
			value="monthly"
			onValueChange={onValueChange}
		/>,
	);

	const group = screen.getByRole("radiogroup", { name: "Repeat" });
	const describedBy = group.getAttribute("aria-describedby") ?? "";
	expect(document.getElementById(describedBy)?.textContent).toBe(helper);

	const radios = screen.getAllByRole<HTMLInputElement>("radio");
	expect(radios).toHaveLength(5);
	expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
	expect(radios[0]?.name).not.toBe("");
	expect(radios.filter((radio) => radio.checked)).toEqual([
		screen.getByRole("radio", { name: "Every month on the 1st" }),
	]);

	fireEvent.click(screen.getByRole("radio", { name: "Every day" }));
	expect(onValueChange).toHaveBeenCalledTimes(1);
	expect(onValueChange).toHaveBeenLastCalledWith("daily");
});

test("label rows show their detail and a separate action", () => {
	const onValueChange = vi.fn();
	const onPress = vi.fn();
	render(
		<OptionList
			mode="multiple"
			label="Labels"
			options={[
				{
					value: "money",
					label: "@money",
					labelColor: "green",
					detail: "6 tasks",
				},
				{
					value: "calls",
					label: "@calls",
					labelColor: "blue",
					detail: "3 tasks",
					disabled: true,
				},
			]}
			value={["money"]}
			onValueChange={onValueChange}
			action={{ label: "New label", onPress }}
		/>,
	);

	const money = screen.getByRole<HTMLInputElement>("checkbox", {
		name: /@money.*6 tasks/,
	});
	expect(money.checked).toBe(true);
	expect(screen.getByText("@money").style.background).toBe(
		"rgb(238, 246, 241)",
	);

	const group = screen.getByRole("group", { name: "Labels" });
	const action = screen.getByRole<HTMLButtonElement>("button", {
		name: "New label",
	});
	expect(group.contains(money)).toBe(true);
	expect(group.contains(action)).toBe(false);
	expect(action.type).toBe("button");
	// The flex row stretches the button to its own height.
	const footer = action.parentElement?.style;
	expect([footer?.display, footer?.minHeight]).toEqual(["flex", "50px"]);
	fireEvent.click(action);
	expect(onPress).toHaveBeenCalledTimes(1);
	expect(onValueChange).not.toHaveBeenCalled();

	const calls = screen.getByRole<HTMLInputElement>("checkbox", {
		name: /@calls.*3 tasks/,
	});
	expect(calls.disabled).toBe(true);
	expect(money.disabled).toBe(false);
});
