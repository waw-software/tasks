import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import Gallery from "./Gallery.tsx";

afterEach(() => {
	cleanup();
});

test("gallery names each project hue next to a decorative marker", () => {
	const { container } = render(<Gallery />);

	for (const name of [
		"Home",
		"Work",
		"Personal",
		"Errands",
		"Reading",
		"Archive",
	]) {
		expect(screen.getByText(name)).toBeDefined();
	}
	const markers = Array.from(
		container.querySelectorAll<HTMLElement>("[data-color]"),
	);
	expect(markers.map((marker) => marker.dataset.color)).toEqual([
		"red",
		"blue",
		"green",
		"amber",
		"violet",
		"black",
	]);
	for (const marker of markers) {
		expect(marker.getAttribute("aria-hidden")).toBe("true");
	}
	expect(markers[0]?.style.width).toBe("8px");
	expect(markers[0]?.style.borderRadius).toBe("3px");
});

test("gallery shows the four label chips on bg and on surface", () => {
	render(<Gallery />);

	for (const name of ["@money", "@calls", "@waiting", "@errands"]) {
		expect(screen.getAllByText(name)).toHaveLength(2);
	}
	const [onBg, onSurface] = screen.getAllByText("@waiting");
	expect(onBg?.style.color).toBe("rgb(138, 90, 0)");
	expect(onSurface?.style.color).toBe("rgb(122, 79, 0)");
});

test("group headers show the count when given, 0 included", () => {
	render(<Gallery />);

	expect(
		screen.getByRole("heading", { name: /Overdue/ }).textContent,
	).toContain("1");
	const today = screen
		.getAllByRole("heading", { name: /Today/ })
		.map((heading) => heading.textContent);
	expect(today).toHaveLength(2);
	expect(today[0]).toContain("3");
	expect(today[1]).toContain("0");
	expect(
		screen.getByRole("heading", { name: /Someday/ }).textContent,
	).not.toMatch(/\d/);
});

test("progress bars expose done of total and hide a zero total", () => {
	render(<Gallery />);

	const bars = screen.getAllByRole("progressbar");
	expect(bars.map((bar) => bar.getAttribute("aria-valuenow"))).toEqual([
		"0",
		"2",
		"7",
	]);
	expect(bars.map((bar) => bar.getAttribute("aria-valuemax"))).toEqual([
		"7",
		"7",
		"7",
	]);
	expect(screen.getByText("2 of 7 done")).toBeDefined();
	expect(screen.queryByText("0 of 0 done")).toBeNull();
});

function checkbox(name: string) {
	return screen.getByRole<HTMLInputElement>("checkbox", { name });
}

test("the rows page shows controlled checkbox examples", () => {
	render(<Gallery section="rows" />);

	expect(checkbox("Unchecked example").checked).toBe(false);
	expect(checkbox("Checked example").checked).toBe(true);

	fireEvent.click(checkbox("Unchecked example"));

	expect(checkbox("Unchecked example").checked).toBe(true);
});

test("the rows page shows the task row fixtures", () => {
	render(<Gallery section="rows" />);

	for (const title of [
		"Pay rent",
		"Review the pull request",
		"Buy milk",
		"Pick up the dry cleaning",
		"Call the landlord about the broken heating in the bathroom before the weekend",
	]) {
		expect(screen.getByText(title)).toBeDefined();
	}
	expect(screen.queryByText("P4")).toBeNull();
	expect(screen.getByText(/1 of 3 subtasks/)).toBeDefined();
	expect(screen.getByText("not synced yet")).toBeDefined();
	expect(
		screen
			.getByText("Review the pull request")
			.closest('[data-part="row"]')
			?.getAttribute("aria-current"),
	).toBe("true");
	expect(checkbox("Buy milk").checked).toBe(true);
	expect(checkbox("Pay rent").checked).toBe(false);

	fireEvent.click(checkbox("Pay rent"));

	expect(checkbox("Pay rent").checked).toBe(true);
});
