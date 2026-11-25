import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { TabBar } from "./TabBar.tsx";

afterEach(() => {
	cleanup();
});

function tabs(): HTMLElement[] {
	const nav = screen.getByRole("navigation", { name: "Main" });
	return Array.from(nav.querySelectorAll("button"));
}

function currentTabs(): (string | null)[] {
	return tabs()
		.filter((tab) => tab.getAttribute("aria-current") === "page")
		.map((tab) => tab.textContent);
}

test("REQ-004: main navigation switches from Today to Browse", () => {
	const onTabChange = vi.fn();
	const { rerender } = render(
		<TabBar activeTab="today" onTabChange={onTabChange} />,
	);

	expect(tabs().map((tab) => tab.textContent)).toEqual([
		"Today",
		"Upcoming",
		"Search",
		"Browse",
	]);
	expect(currentTabs()).toEqual(["Today"]);

	fireEvent.click(screen.getByRole("button", { name: "Browse" }));
	expect(onTabChange.mock.calls).toEqual([["browse"]]);

	rerender(<TabBar activeTab="browse" onTabChange={onTabChange} />);
	expect(currentTabs()).toEqual(["Browse"]);
});

test("REQ-005: Add task is a separate named action", () => {
	const onTabChange = vi.fn();
	const onAdd = vi.fn();
	const { rerender } = render(
		<TabBar activeTab="today" onTabChange={onTabChange} onAdd={onAdd} />,
	);

	fireEvent.click(screen.getByRole("button", { name: "Add task" }));
	expect(onAdd).toHaveBeenCalledTimes(1);
	expect(onTabChange).not.toHaveBeenCalled();
	expect(currentTabs()).toEqual(["Today"]);
	expect(tabs()).toHaveLength(4);

	rerender(<TabBar activeTab="today" onTabChange={onTabChange} />);
	expect(screen.queryByRole("button", { name: "Add task" })).toBeNull();
});

test("uses the documented sizes and colours", () => {
	render(<TabBar activeTab="today" onTabChange={() => {}} onAdd={() => {}} />);

	const look = (name: string) => {
		const { style } = screen.getByRole("button", { name });
		return {
			minHeight: style.minHeight,
			minWidth: style.minWidth,
			size: style.fontSize,
			weight: style.fontWeight,
			vars: ["--waw-bg", "--waw-ink", "--waw-bg-hover", "--waw-bg-active"].map(
				(variable) => style.getPropertyValue(variable),
			),
		};
	};
	expect(look("Today")).toEqual({
		minHeight: "52px",
		minWidth: "44px",
		size: "11px",
		weight: "600",
		vars: ["#FFFFFF", "#D4213D", "#F6F5F2", "#EEECE8"],
	});
	expect(look("Upcoming")).toEqual({
		minHeight: "52px",
		minWidth: "44px",
		size: "11px",
		weight: "500",
		vars: ["#FFFFFF", "#5C5C5C", "#F6F5F2", "#EEECE8"],
	});
	expect(screen.getByText("Today").style.borderBottom).toBe(
		"2px solid rgb(212, 33, 61)",
	);
	expect(screen.getByText("Upcoming").style.borderBottom).toBe(
		"2px solid transparent",
	);

	const fab = screen.getByRole("button", { name: "Add task" });
	expect({
		width: fab.style.width,
		height: fab.style.height,
		radius: fab.style.borderRadius,
		vars: ["--waw-bg", "--waw-ink", "--waw-bg-hover", "--waw-bg-active"].map(
			(variable) => fab.style.getPropertyValue(variable),
		),
	}).toEqual({
		width: "56px",
		height: "56px",
		radius: "18px",
		vars: ["#D4213D", "#FFFFFF", "#8C1427", "#8C1427"],
	});
});
