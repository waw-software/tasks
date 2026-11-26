import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { Dialog } from "./Dialog.tsx";
import { Sheet } from "./Sheet.tsx";

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
	cleanup();
});

test("REQ-005 presentation: the quick-add dialog is controlled, named and returns focus", () => {
	const onDismiss = vi.fn();
	const focusAtAfterClose: (Element | null)[] = [];
	const onAfterClose = vi.fn(() => {
		focusAtAfterClose.push(document.activeElement);
	});
	const view = (open: boolean) => (
		<StrictMode>
			<button type="button">Quick add</button>
			<Dialog
				open={open}
				title="New task"
				onDismiss={onDismiss}
				onAfterClose={onAfterClose}
				footer={<button type="button">Add task</button>}
			>
				<input aria-label="Task" />
			</Dialog>
		</StrictMode>
	);
	const { rerender } = render(view(false));
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(screen.queryByRole("heading")).toBeNull();
	const launcher = screen.getByRole("button", { name: "Quick add" });
	launcher.focus();

	rerender(view(true));
	const dialog = screen.getByRole("dialog", { name: "New task" });
	const heading = screen.getByRole("heading", { level: 1, name: "New task" });
	expect(document.activeElement).toBe(heading);

	// A rerender while open does not move the focus again.
	const field = screen.getByLabelText("Task");
	field.focus();
	rerender(view(true));
	expect(document.activeElement).toBe(field);

	const cancel = new Event("cancel", { cancelable: true });
	fireEvent(dialog, cancel);
	expect(cancel.defaultPrevented).toBe(true);
	expect(onDismiss.mock.calls).toEqual([["escape"]]);
	expect(screen.getByRole("dialog", { name: "New task" })).toBe(dialog);
	expect(onAfterClose).not.toHaveBeenCalled();

	rerender(view(false));
	expect(screen.queryByRole("dialog")).toBeNull();
	expect(dialog.hasAttribute("open")).toBe(false);
	expect(document.activeElement).toBe(launcher);
	expect(onAfterClose).toHaveBeenCalledTimes(1);
	expect(focusAtAfterClose).toEqual([launcher]);

	rerender(view(false));
	expect(onAfterClose).toHaveBeenCalledTimes(1);
});

test("the Escape key requests dismissal once and holds back the native close", () => {
	const onDismiss = vi.fn();
	render(
		<Dialog open title="New task" onDismiss={onDismiss}>
			Body
		</Dialog>,
	);
	const heading = screen.getByRole("heading", { name: "New task" });
	// false: the default, which would raise the native close request, is prevented.
	expect(fireEvent.keyDown(heading, { key: "Escape" })).toBe(false);
	expect(fireEvent.keyDown(heading, { key: "Escape" })).toBe(false);
	expect(onDismiss.mock.calls).toEqual([["escape"], ["escape"]]);
});

test("Tab and Shift+Tab wrap inside the dialog", () => {
	render(
		<Dialog
			open
			title="New task"
			onDismiss={() => {}}
			footer={
				<>
					<button type="button">Add task</button>
					<button type="button" disabled>
						Unavailable
					</button>
				</>
			}
		>
			<input aria-label="Task" />
		</Dialog>,
	);
	const heading = screen.getByRole("heading", { name: "New task" });
	const first = screen.getByRole("button", { name: "Close dialog" });
	const last = screen.getByRole("button", { name: "Add task" });

	expect(fireEvent.keyDown(heading, { key: "Tab", shiftKey: true })).toBe(
		false,
	);
	expect(document.activeElement).toBe(last);
	expect(fireEvent.keyDown(last, { key: "Tab" })).toBe(false);
	expect(document.activeElement).toBe(first);
	expect(fireEvent.keyDown(first, { key: "Tab", shiftKey: true })).toBe(false);
	expect(document.activeElement).toBe(last);
	// Between the ends the browser moves the focus.
	const field = screen.getByLabelText("Task");
	field.focus();
	expect(fireEvent.keyDown(field, { key: "Tab" })).toBe(true);
	expect(fireEvent.keyDown(field, { key: "Tab", shiftKey: true })).toBe(true);
});

test("DESIGN §3: the sheet backdrop policy", () => {
	const onDismiss = vi.fn();
	const view = (dismissOnBackdrop: boolean) => (
		<Sheet
			open
			title="New task"
			onDismiss={onDismiss}
			dismissOnBackdrop={dismissOnBackdrop}
		>
			<p>Body text</p>
		</Sheet>
	);
	const { rerender } = render(view(false));
	const sheet = screen.getByRole("dialog", { name: "New task" });
	const content = screen.getByText("Body text");
	sheet.getBoundingClientRect = () => new DOMRect(0, 400, 390, 444);
	const outside = { button: 0, clientX: 100, clientY: 100 };
	const inside = { button: 0, clientX: 100, clientY: 500 };

	fireEvent.pointerDown(sheet, outside);
	fireEvent.pointerUp(sheet, outside);
	expect(onDismiss).not.toHaveBeenCalled();

	rerender(view(true));
	fireEvent.pointerDown(sheet, outside);
	fireEvent.pointerUp(sheet, outside);
	expect(onDismiss.mock.calls).toEqual([["backdrop"]]);
	onDismiss.mockClear();

	// A drag out of the content, or into it.
	fireEvent.pointerDown(content, inside);
	fireEvent.pointerUp(sheet, outside);
	fireEvent.pointerDown(sheet, outside);
	fireEvent.pointerUp(content, inside);
	// The sheet's own padding targets the dialog element too.
	fireEvent.pointerDown(sheet, inside);
	fireEvent.pointerUp(sheet, inside);
	fireEvent.pointerDown(sheet, inside);
	fireEvent.pointerUp(sheet, outside);
	fireEvent.pointerDown(sheet, outside);
	fireEvent.pointerUp(sheet, inside);
	// A release without a press of its own, and a secondary button.
	fireEvent.pointerUp(sheet, outside);
	fireEvent.pointerDown(sheet, { ...outside, button: 2 });
	fireEvent.pointerUp(sheet, { ...outside, button: 2 });
	expect(onDismiss).not.toHaveBeenCalled();

	fireEvent.click(screen.getByRole("button", { name: "Close sheet" }));
	expect(onDismiss.mock.calls).toEqual([["close"]]);
});

test("Dialog and Sheet use their placements", () => {
	const props = { open: true, onDismiss: () => {}, children: "Body" };
	render(
		<>
			<Dialog {...props} title="Centred" />
			<Sheet {...props} title="Docked" />
		</>,
	);
	const dialog = screen.getByRole("dialog", { name: "Centred" });
	expect(dialog.style.maxWidth).toBe("600px");
	expect(dialog.style.borderRadius).toBe("18px");
	// jsdom puts the colour first when it reads a shadow back.
	expect(dialog.style.boxShadow).toBe("rgba(0, 0, 0, 0.25) 0px 24px 60px");
	expect(dialog.style.margin).toBe("auto");
	expect(dialog.style.padding).toBe("24px");
	expect(dialog.style.getPropertyValue("--waw-scrim")).toBe(
		"rgba(23,23,23,0.45)",
	);

	const sheet = screen.getByRole("dialog", { name: "Docked" });
	expect(sheet.style.width).toBe("100%");
	expect(sheet.style.maxWidth).toBe("none");
	expect(sheet.style.maxHeight).toBe("92dvh");
	expect(sheet.style.borderRadius).toBe("18px 18px 0px 0px");
	expect(sheet.style.boxShadow).toBe("none");

	const close = screen.getByRole("button", { name: "Close dialog" });
	expect(close.style.width).toBe("44px");
	expect(close.style.height).toBe("44px");
});
