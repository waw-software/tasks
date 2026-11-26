import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import OverlaysGallery from "./OverlaysGallery.tsx";

// jsdom has no modal dialog methods.
beforeAll(() => {
	HTMLDialogElement.prototype.showModal = function showModal() {
		this.setAttribute("open", "");
	};
	HTMLDialogElement.prototype.close = function close() {
		this.removeAttribute("open");
		this.dispatchEvent(new Event("close"));
	};
});

afterEach(() => {
	vi.unstubAllGlobals();
	cleanup();
});

// Answers the "(width < Npx)" queries as a viewport of the given width would.
function stubViewport(width: number) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: width < Number(/\d+/.exec(query)?.[0]),
		addEventListener: () => {},
		removeEventListener: () => {},
	}));
}

function button(name: string) {
	return screen.getByRole("button", { name });
}

test("REQ-005 presentation: quick add opens as a dialog from 700 px and as a sheet below", () => {
	for (const { width, closeLabel, otherLabel } of [
		{ width: 1440, closeLabel: "Close dialog", otherLabel: "Close sheet" },
		{ width: 700, closeLabel: "Close dialog", otherLabel: "Close sheet" },
		{ width: 699, closeLabel: "Close sheet", otherLabel: "Close dialog" },
		{ width: 390, closeLabel: "Close sheet", otherLabel: "Close dialog" },
	]) {
		stubViewport(width);
		render(<OverlaysGallery />);
		expect(screen.queryByRole("dialog")).toBeNull();
		const launcher = button("Quick add");

		fireEvent.click(launcher);

		const dialog = within(screen.getByRole("dialog", { name: "New task" }));
		expect(dialog.getByRole("button", { name: closeLabel })).toBeDefined();
		expect(dialog.queryByRole("button", { name: otherLabel })).toBeNull();
		const input = dialog.getByRole("textbox", {
			name: "Task",
		}) as HTMLInputElement;
		expect(input.value).toBe("Pay rent every 1st at 9:00 p1 #Home @money");
		fireEvent.change(input, { target: { value: "Water the plants" } });
		expect(input.value).toBe("Water the plants");
		const chips = within(dialog.getByRole("list", { name: "Understood as" }));
		expect(chips.getAllByRole("listitem").map((i) => i.textContent)).toEqual([
			"Every month on the 1st",
			"09:00",
			"Priority 1",
			"Home",
			"@money",
		]);
		expect(
			dialog.getByText(
				"Type it the way you say it: dates, p1 to p4, #project, @label.",
			),
		).toBeDefined();

		fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.activeElement).toBe(launcher);
		expect(screen.queryByText("Selected: Add task")).toBeNull();
		cleanup();
	}
});

test("quick add: Add task closes and reports; the close button and Escape close", () => {
	stubViewport(1440);
	render(<OverlaysGallery />);

	for (const dismiss of [
		() => fireEvent.click(button("Close dialog")),
		() =>
			fireEvent.keyDown(screen.getByRole("dialog"), {
				key: "Escape",
			}),
	]) {
		fireEvent.click(button("Quick add"));
		dismiss();
		expect(screen.queryByRole("dialog")).toBeNull();
	}
	expect(screen.queryByText("Selected: Add task")).toBeNull();

	fireEvent.click(button("Quick add"));
	fireEvent.click(
		within(screen.getByRole("dialog")).getByRole("button", {
			name: "Add task",
		}),
	);

	expect(screen.queryByRole("dialog")).toBeNull();
	expect(screen.getByText("Selected: Add task")).toBeDefined();
});

test("quick add: a page mounted open focuses its launcher after closing", () => {
	stubViewport(390);
	render(<OverlaysGallery quickAddOpen />);

	expect(
		screen.getByRole("heading", { level: 1, name: "New task" }),
	).toBeDefined();
	expect(screen.getByRole("dialog", { name: "New task" })).toBeDefined();
	expect(screen.getByText("Overlays").tagName).toBe("H1");

	fireEvent.click(button("Cancel"));

	expect(screen.queryByRole("dialog")).toBeNull();
	expect(document.activeElement).toBe(button("Quick add"));
});

test("quick add: focus returns to the launcher even when it did not have it", () => {
	stubViewport(1440);
	render(<OverlaysGallery />);
	const back = screen.getByRole("link", { name: "Back" });
	back.focus();

	// A click in jsdom, as in some browsers, leaves the focus where it was.
	fireEvent.click(button("Quick add"));
	fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

	expect(screen.queryByRole("dialog")).toBeNull();
	expect(document.activeElement).toBe(button("Quick add"));
});

test("the page shows Back and the three sample rows", () => {
	stubViewport(390);
	render(<OverlaysGallery />);

	expect(
		screen.getByRole("heading", { level: 1, name: "Overlays" }),
	).toBeDefined();
	expect(screen.getByRole("link", { name: "Back" }).getAttribute("href")).toBe(
		"#/gallery",
	);
	expect(
		screen.getByRole("heading", { level: 2, name: "Today" }),
	).toBeDefined();
	for (const name of ["Pay rent", "Review the pull request", "Buy milk"]) {
		expect(screen.getByRole("checkbox", { name })).toBeDefined();
	}
	expect(screen.getByText(/09:00 · repeats monthly/)).toBeDefined();

	const milk = screen.getByRole("checkbox", {
		name: "Buy milk",
	}) as HTMLInputElement;
	fireEvent.click(milk);
	expect(milk.checked).toBe(true);
});

test("DESIGN §3: the wide page shows the inline task panel", () => {
	stubViewport(1440);
	render(<OverlaysGallery />);

	const panel = within(screen.getByRole("complementary", { name: "Pay rent" }));
	for (const text of [
		"Home / Bills",
		"Transfer to the landlord by the 1st.",
		"Due",
		"Mon 1 Dec · 09:00",
		"Priority",
		"P1",
		"Labels",
		"@money",
		"Reminder",
		"1 day before",
		"SUBTASKS · 1 OF 3",
		"Make the transfer",
		"Save the confirmation",
		"Repeats monthly · next on Tue 1 Dec",
	]) {
		expect(panel.getByText(text)).toBeDefined();
	}
	expect(panel.getByText("Check the amount")).toBeDefined();
	expect(panel.getByRole("img", { name: "Done" })).toBeDefined();
	expect(panel.queryByRole("checkbox")).toBeNull();
	expect(screen.queryByRole("button", { name: "Open details" })).toBeNull();

	fireEvent.click(panel.getByRole("button", { name: "Close panel" }));

	expect(screen.queryByRole("complementary")).toBeNull();
	fireEvent.click(button("Open details"));
	expect(screen.getByRole("complementary", { name: "Pay rent" })).toBeDefined();
	expect(screen.queryByRole("button", { name: "Open details" })).toBeNull();
	cleanup();

	for (const [width, shown] of [
		[1100, true],
		[1099, false],
		[900, false],
	] as const) {
		stubViewport(width);
		render(<OverlaysGallery />);
		expect(screen.queryByRole("complementary") !== null).toBe(shown);
		expect(screen.queryByRole("button", { name: "Open details" })).toBeNull();
		cleanup();
	}
});
