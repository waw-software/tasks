import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Checkbox } from "./Checkbox.tsx";

afterEach(() => {
	cleanup();
});

test("a named controlled checkbox emits the next value and follows its prop", () => {
	const onCheckedChange = vi.fn();
	const { rerender } = render(
		<Checkbox
			checked={false}
			label="Pay rent"
			onCheckedChange={onCheckedChange}
		/>,
	);
	const input = screen.getByRole<HTMLInputElement>("checkbox", {
		name: "Pay rent",
	});
	expect(input.checked).toBe(false);

	fireEvent.click(input);
	expect(onCheckedChange).toHaveBeenLastCalledWith(true);
	expect(input.checked).toBe(false);

	rerender(
		<Checkbox checked label="Pay rent" onCheckedChange={onCheckedChange} />,
	);
	expect(input.checked).toBe(true);

	fireEvent.click(input);
	expect(onCheckedChange).toHaveBeenLastCalledWith(false);
	expect(onCheckedChange).toHaveBeenCalledTimes(2);
	expect(input.checked).toBe(true);
});

test("uses a 44 px target and a 22 px face", () => {
	const { container, rerender } = render(
		<Checkbox checked={false} label="Pay rent" onCheckedChange={() => {}} />,
	);
	const input = screen.getByRole("checkbox");
	const wrapper = input.parentElement;
	const face = container.querySelector<HTMLElement>('[data-part="face"]');
	expect(wrapper?.style.width).toBe("44px");
	expect(wrapper?.style.height).toBe("44px");
	expect(input.style.position).toBe("absolute");
	expect(input.style.width).toBe("100%");
	expect(input.style.height).toBe("100%");
	expect(face?.style.width).toBe("22px");
	expect(face?.style.height).toBe("22px");
	expect(face?.style.borderColor).toBe("rgb(92, 92, 92)");
	expect(face?.getAttribute("aria-hidden")).toBe("true");

	rerender(<Checkbox checked label="Pay rent" onCheckedChange={() => {}} />);
	expect(face?.style.background).toBe("rgb(23, 23, 23)");
	expect(face?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
});
