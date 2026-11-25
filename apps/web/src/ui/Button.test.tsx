import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { Button, type ButtonProps } from "./Button.tsx";

afterEach(() => {
	cleanup();
});

function Consumer(): React.JSX.Element {
	const [selected, setSelected] = useState("nothing");
	return (
		<>
			<Button
				label="Connect"
				variant="primary"
				onPress={() => setSelected("Connect")}
			/>
			<Button
				label="Check again"
				variant="secondary"
				disabled
				onPress={() => setSelected("Check again")}
			/>
			<p>Selected: {selected}</p>
		</>
	);
}

test("activates a named button without submitting a form and ignores a disabled button", () => {
	const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
	render(
		<form onSubmit={submit}>
			<Consumer />
		</form>,
	);

	fireEvent.click(screen.getByRole("button", { name: "Connect" }));
	expect(screen.getByText("Selected: Connect")).toBeDefined();
	expect(submit).not.toHaveBeenCalled();

	const disabled = screen.getByRole<HTMLButtonElement>("button", {
		name: "Check again",
	});
	expect(disabled.disabled).toBe(true);
	fireEvent.click(disabled);
	expect(screen.getByText("Selected: Connect")).toBeDefined();
});

test("does not type a disabled text button, also through a variable", () => {
	// A direct literal is already refused as an excess property; a variable is not.
	const props = {
		variant: "text" as const,
		label: "x",
		onPress: () => {},
		disabled: true,
	};
	// @ts-expect-error text buttons cannot be disabled
	const bad: ButtonProps = props;

	expect(bad.variant).toBe("text");
});

test("sets the documented geometry and colour variables", () => {
	const onPress = () => {};
	const cases: {
		props: ButtonProps;
		minHeight: string;
		radius: string;
		width: string;
		colors: [bg: string, ink: string, edge: string];
	}[] = [
		{
			props: { label: "Regular", variant: "primary", onPress },
			minHeight: "52px",
			radius: "14px",
			width: "",
			colors: ["#D4213D", "#FFFFFF", "#D4213D"],
		},
		{
			props: {
				label: "Compact",
				variant: "primary",
				size: "compact",
				onPress,
			},
			minHeight: "44px",
			radius: "14px",
			width: "",
			colors: ["#D4213D", "#FFFFFF", "#D4213D"],
		},
		{
			props: { label: "Secondary", variant: "secondary", onPress },
			minHeight: "44px",
			radius: "12px",
			width: "",
			colors: ["#FFFFFF", "#171717", "#D9D6D0"],
		},
		{
			props: { label: "Text", variant: "text", onPress },
			minHeight: "44px",
			radius: "12px",
			width: "",
			colors: ["transparent", "#B01A31", "transparent"],
		},
		{
			props: { label: "Wide", variant: "primary", fullWidth: true, onPress },
			minHeight: "52px",
			radius: "14px",
			width: "100%",
			colors: ["#D4213D", "#FFFFFF", "#D4213D"],
		},
		{
			props: { label: "Off", variant: "primary", disabled: true, onPress },
			minHeight: "52px",
			radius: "14px",
			width: "",
			colors: ["#F6F5F2", "#5C5C5C", "#F6F5F2"],
		},
		{
			props: {
				label: "Off secondary",
				variant: "secondary",
				disabled: true,
				onPress,
			},
			minHeight: "44px",
			radius: "12px",
			width: "",
			colors: ["#F6F5F2", "#5C5C5C", "#D9D6D0"],
		},
	];

	for (const { props, minHeight, radius, width, colors } of cases) {
		render(<Button {...props} />);
		const { style } = screen.getByRole("button", { name: props.label });
		expect({
			label: props.label,
			minHeight: style.minHeight,
			minWidth: style.minWidth,
			radius: style.borderRadius,
			width: style.width,
			lines: ["--waw-border", "--waw-focus-width", "--waw-focus-offset"].map(
				(name) => style.getPropertyValue(name),
			),
			colors: ["--waw-bg", "--waw-ink", "--waw-edge"].map((name) =>
				style.getPropertyValue(name),
			),
		}).toEqual({
			label: props.label,
			minHeight,
			minWidth: "44px",
			radius,
			width,
			lines: ["1px", "2px", "2px"],
			colors,
		});
	}
});
