import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DetailPanel } from "./DetailPanel.tsx";

afterEach(() => {
	cleanup();
});

test("DESIGN §3: the inline detail panel is labelled and leaves the page interactive", () => {
	const onClose = vi.fn();
	const onOutside = vi.fn();
	render(
		<>
			<button type="button" onClick={onOutside}>
				Neighbour
			</button>
			<DetailPanel
				title="Pay rent"
				footer={<button type="button">Done</button>}
				onClose={onClose}
			>
				<input aria-label="Note" />
			</DetailPanel>
		</>,
	);

	const panel = screen.getByRole("complementary", { name: "Pay rent" });
	expect(
		screen.getByRole("heading", { level: 2, name: "Pay rent" }),
	).toBeTruthy();
	expect(panel.contains(screen.getByLabelText("Note"))).toBe(true);
	expect(panel.contains(screen.getByRole("button", { name: "Done" }))).toBe(
		true,
	);

	const neighbour = screen.getByRole("button", { name: "Neighbour" });
	neighbour.focus();
	expect(document.activeElement).toBe(neighbour);
	fireEvent.click(neighbour);
	expect(onOutside).toHaveBeenCalledTimes(1);

	fireEvent.keyDown(neighbour, { key: "Escape" });
	expect(onClose).not.toHaveBeenCalled();

	fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
	expect(onClose).toHaveBeenCalledTimes(1);

	const note = screen.getByLabelText("Note");
	note.focus();
	fireEvent.keyDown(note, { key: "Enter" });
	expect(onClose).toHaveBeenCalledTimes(1);
	fireEvent.keyDown(note, { key: "Escape" });
	expect(onClose).toHaveBeenCalledTimes(2);
});

test("uses the documented width", () => {
	render(
		<DetailPanel title="Pay rent" onClose={() => {}}>
			Body
		</DetailPanel>,
	);

	const { style } = screen.getByRole("complementary", { name: "Pay rent" });
	expect({
		width: style.width,
		minWidth: style.minWidth,
		maxWidth: style.maxWidth,
	}).toEqual({ width: "380px", minWidth: "340px", maxWidth: "440px" });
});
