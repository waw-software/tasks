import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { TextInput } from "./TextInput.tsx";

afterEach(() => {
	cleanup();
});

function descriptionOf(element: HTMLElement): string | null {
	const ids = element.getAttribute("aria-describedby");
	if (ids === null) return null;
	return ids
		.split(" ")
		.map((id) => document.getElementById(id)?.textContent ?? "")
		.join(" ");
}

function StatefulField() {
	const [value, setValue] = useState("https://tasks.example.com");
	return (
		<TextInput
			label="Stateful address"
			kind="url"
			value={value}
			onValueChange={setValue}
		/>
	);
}

test("associates the label and the current description", () => {
	render(
		<>
			<TextInput
				kind="url"
				label="Server address"
				value="https://tasks.example.com"
				helperText="Enter its address to continue."
				onValueChange={() => {}}
			/>
			<TextInput
				kind="token"
				label="Access token"
				value="example-only"
				onValueChange={() => {}}
			/>
		</>,
	);
	const url = screen.getByLabelText("Server address");
	const token = screen.getByLabelText("Access token");

	expect(url.getAttribute("type")).toBe("url");
	expect(descriptionOf(url)).toBe("Enter its address to continue.");
	expect(token.getAttribute("type")).toBe("password");
	expect(token.getAttribute("aria-describedby")).toBeNull();
	expect(url.id).not.toBe("");
	expect(url.id).not.toBe(token.id);
	for (const input of [url, token]) {
		expect(input.getAttribute("autocapitalize")).toBe("off");
		expect(input.getAttribute("autocorrect")).toBe("off");
		expect(input.getAttribute("spellcheck")).toBe("false");
		expect(input.style.fontFamily).toBe("ui-monospace, Menlo, monospace");
	}
});

test("announces an error in the same live region and restores the helper", () => {
	const field = (errorText?: string) => (
		<TextInput
			label="Access token"
			kind="token"
			value="example-only"
			helperText="Paste the token from your server."
			{...(errorText === undefined ? {} : { errorText })}
			onValueChange={() => {}}
		/>
	);
	const { rerender } = render(field());
	const input = screen.getByLabelText("Access token");
	const alert = screen.getByRole("alert");
	expect(alert.textContent).toBe("");
	expect(alert.style.position).toBe("absolute");
	expect(input.getAttribute("aria-invalid")).toBeNull();
	expect(descriptionOf(input)).toBe("Paste the token from your server.");

	rerender(field("Enter a valid access token."));
	expect(screen.getByRole("alert")).toBe(alert);
	expect(alert.textContent).toBe("Enter a valid access token.");
	expect(alert.style.position).toBe("");
	expect(alert.style.color).toBe("rgb(176, 26, 49)");
	expect(input.getAttribute("aria-invalid")).toBe("true");
	expect(descriptionOf(input)).toBe("Enter a valid access token.");
	expect(screen.queryByText("Paste the token from your server.")).toBeNull();

	rerender(field());
	expect(screen.getByRole("alert")).toBe(alert);
	expect(alert.textContent).toBe("");
	expect(input.getAttribute("aria-invalid")).toBeNull();
	expect(descriptionOf(input)).toBe("Paste the token from your server.");
	expect(screen.getByText("Paste the token from your server.")).toBeTruthy();
});

test("emits edits and follows the value supplied by the caller", () => {
	const onValueChange = vi.fn();
	render(
		<>
			<TextInput
				label="Held address"
				kind="url"
				value="https://tasks.example.com"
				onValueChange={onValueChange}
			/>
			<StatefulField />
		</>,
	);
	const held = screen.getByLabelText<HTMLInputElement>("Held address");
	fireEvent.change(held, {
		target: { value: "https://other.example.com" },
	});
	expect(onValueChange).toHaveBeenCalledTimes(1);
	expect(onValueChange).toHaveBeenLastCalledWith("https://other.example.com");
	expect(held.value).toBe("https://tasks.example.com");

	const stateful = screen.getByLabelText<HTMLInputElement>("Stateful address");
	fireEvent.change(stateful, {
		target: { value: "https://other.example.com" },
	});
	expect(stateful.value).toBe("https://other.example.com");
});

test("a disabled field is marked and keeps its value", () => {
	const field = (props: { disabled?: boolean; errorText?: string }) => (
		<TextInput
			label="Server address"
			value="https://tasks.example.com"
			onValueChange={() => {}}
			{...props}
		/>
	);
	const { rerender } = render(field({ disabled: true }));
	const input = screen.getByLabelText<HTMLInputElement>("Server address");
	expect(input.disabled).toBe(true);
	expect(input.value).toBe("https://tasks.example.com");
	expect(input.type).toBe("text");
	expect(input.style.borderColor).toBe("rgb(217, 214, 208)");
	expect(input.style.color).toBe("rgb(92, 92, 92)");

	rerender(field({}));
	expect(input.disabled).toBe(false);
	expect(input.style.borderColor).toBe("rgb(92, 92, 92)");
	expect(input.style.color).toBe("rgb(23, 23, 23)");
	expect(input.style.background).toBe("rgb(246, 245, 242)");
	expect(input.style.minHeight).toBe("50px");
	expect(input.style.fontFamily).toBe("Inter");

	rerender(field({ errorText: "Enter a valid server URL." }));
	expect(input.style.borderColor).toBe("rgb(176, 26, 49)");
});
