import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { TaskRow, type TaskRowProps } from "./TaskRow.tsx";

afterEach(() => {
	cleanup();
});

const base: TaskRowProps = {
	title: "Pay rent",
	checked: false,
	onCheckedChange: () => {},
	priority: 4,
};

const full: TaskRowProps = {
	...base,
	priority: 1,
	scheduleText: "09:00 · repeats monthly",
	labels: [
		{ name: "@money", color: "green" },
		{ name: "@waiting", color: "amber" },
	],
	project: { name: "Home", color: "red" },
};

function part(container: HTMLElement, name: string): HTMLElement | null {
	return container.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

test("AC-10 shows P1 to P3 in their ink and hides P4", () => {
	const inks = [
		[1, "rgb(176, 26, 49)"],
		[2, "rgb(138, 90, 0)"],
		[3, "rgb(31, 95, 191)"],
	] as const;
	for (const [priority, ink] of inks) {
		render(<TaskRow {...base} priority={priority} />);
		const marker = screen.getByText(`P${priority}`);
		expect(marker.style.color).toBe(ink);
		expect(marker.style.fontWeight).toBe("600");
		cleanup();
	}

	const { container } = render(
		<TaskRow {...base} scheduleText="09:00 · repeats monthly" />,
	);
	expect(screen.queryByText("P4")).toBeNull();
	expect(part(container, "meta")?.textContent).toBe("09:00 · repeats monthly");
});

test("AC-08 shows subtask progress in the meta line", () => {
	const { container, rerender } = render(
		<TaskRow {...base} subtasks={{ done: 1, total: 3 }} />,
	);
	expect(part(container, "meta")?.textContent).toBe("1 of 3 subtasks");

	rerender(<TaskRow {...base} subtasks={{ done: 0, total: 3 }} />);
	expect(part(container, "meta")?.textContent).toBe("0 of 3 subtasks");

	rerender(<TaskRow {...base} subtasks={{ done: 0, total: 0 }} />);
	expect(screen.queryByText(/subtasks/)).toBeNull();
});

test("AC-29 marks a row that is not synced yet", () => {
	const { rerender } = render(<TaskRow {...base} pendingSync />);
	const status = screen.getByText("not synced yet");
	expect(status.style.color).toBe("rgb(138, 90, 0)");
	expect(status.style.fontWeight).toBe("600");

	rerender(<TaskRow {...base} />);
	expect(screen.queryByText("not synced yet")).toBeNull();
});

test("orders the meta line and keeps the project marker after its name", () => {
	const { container } = render(
		<TaskRow {...full} subtasks={{ done: 1, total: 3 }} pendingSync />,
	);
	expect(part(container, "meta")?.textContent).toBe(
		"P1 · 09:00 · repeats monthly · 1 of 3 subtasksnot synced yet@money@waitingHome",
	);
	const project = part(container, "project");
	expect(project?.textContent).toBe("Home");
	expect(project?.lastElementChild).toBe(
		project?.querySelector('[data-color="red"]'),
	);
});

test("checked and selected are independent", () => {
	const { container, rerender } = render(<TaskRow {...base} checked />);
	const title = screen.getByText("Pay rent");
	expect(title.style.textDecoration).toBe("line-through");
	expect(title.style.color).toBe("rgb(92, 92, 92)");
	expect(part(container, "row")?.getAttribute("aria-current")).toBeNull();

	rerender(<TaskRow {...base} selected />);
	expect(part(container, "row")?.style.backgroundColor).toBe(
		"rgb(252, 235, 238)",
	);
	expect(part(container, "row")?.getAttribute("aria-current")).toBe("true");
	expect(title.style.textDecoration).not.toBe("line-through");
	expect(title.style.color).toBe("rgb(23, 23, 23)");
});

test("hover fills surface for a mouse only and never over a selected row", () => {
	const { container, rerender } = render(<TaskRow {...full} pendingSync />);
	const row = part(container, "row") as HTMLElement;
	const chip = screen.getByText("@waiting");
	const status = screen.getByText("not synced yet");

	fireEvent.pointerEnter(row, { pointerType: "mouse" });
	expect(row.style.backgroundColor).toBe("rgb(246, 245, 242)");
	expect(chip.style.color).toBe("rgb(122, 79, 0)");
	expect(status.style.color).toBe("rgb(122, 79, 0)");

	fireEvent.pointerLeave(row, { pointerType: "mouse" });
	expect(row.style.backgroundColor).toBe("transparent");
	expect(chip.style.color).toBe("rgb(138, 90, 0)");
	expect(status.style.color).toBe("rgb(138, 90, 0)");

	fireEvent.pointerEnter(row, { pointerType: "touch" });
	expect(row.style.backgroundColor).toBe("transparent");

	rerender(<TaskRow {...full} pendingSync selected />);
	fireEvent.pointerEnter(row, { pointerType: "mouse" });
	expect(row.style.backgroundColor).toBe("rgb(252, 235, 238)");
	expect(chip.style.color).toBe("rgb(138, 90, 0)");
	expect(status.style.color).toBe("rgb(138, 90, 0)");
});

test("a row with no meta parts renders no meta line", () => {
	const { container } = render(<TaskRow {...base} labels={[]} />);
	expect(screen.getByRole("checkbox", { name: "Pay rent" })).toBeDefined();
	expect(part(container, "meta")).toBeNull();
});
