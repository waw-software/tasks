import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { TextInput, type TextInputProps } from "./TextInput";

function input(label: string) {
	return screen.getByTestId(`input-${label}`);
}

function inputStyle(label: string) {
	return StyleSheet.flatten(input(label).props.style);
}

function ServerAddress(props: Partial<TextInputProps>) {
	return (
		<TextInput
			label="Server address"
			value="https://tasks.example.com"
			onValueChange={jest.fn()}
			kind="url"
			helperText="Use the address of your server."
			{...props}
		/>
	);
}

function StatefulServerAddress() {
	const [value, setValue] = useState("https://tasks.example.com");
	return <ServerAddress value={value} onValueChange={setValue} />;
}

describe("TextInput", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("reads the label and active hint and masks token entry", async () => {
		await render(
			<>
				<ServerAddress />
				<TextInput
					label="Access token"
					value="fixture-token"
					onValueChange={jest.fn()}
					kind="token"
					helperText="Paste the token from your server."
					errorText="Enter a valid access token."
				/>
			</>,
		);

		expect(screen.getByText("Server address")).toBeOnTheScreen();
		expect(screen.getByLabelText("Server address")).toBe(
			input("Server address"),
		);
		expect(input("Server address").props).toMatchObject({
			keyboardType: "url",
			autoCapitalize: "none",
			autoCorrect: false,
			accessibilityHint: "Use the address of your server.",
		});
		expect(input("Server address").props.secureTextEntry).toBeFalsy();
		expect(inputStyle("Server address")).toMatchObject({
			fontFamily: "ui-monospace",
		});
		expect(
			screen.getByText("Use the address of your server."),
		).toBeOnTheScreen();

		expect(input("Access token").props).toMatchObject({
			secureTextEntry: true,
			autoCapitalize: "none",
			autoCorrect: false,
			accessibilityHint: "Enter a valid access token.",
		});
		expect(inputStyle("Access token")).toMatchObject({
			fontFamily: "ui-monospace",
			borderColor: "#B01A31",
		});
		expect(screen.getByText("Enter a valid access token.")).toBeOnTheScreen();
		expect(screen.queryByText("Paste the token from your server.")).toBeNull();
	});

	it("follows the value supplied by the caller", async () => {
		const onValueChange = jest.fn();
		const view = await render(<ServerAddress onValueChange={onValueChange} />);

		await fireEvent.changeText(
			input("Server address"),
			"https://other.example.com",
		);

		expect(onValueChange).toHaveBeenLastCalledWith("https://other.example.com");
		expect(input("Server address").props.value).toBe(
			"https://tasks.example.com",
		);

		await view.rerender(<StatefulServerAddress />);

		await fireEvent.changeText(
			input("Server address"),
			"https://other.example.com",
		);

		expect(input("Server address").props.value).toBe(
			"https://other.example.com",
		);
	});

	it("announces a new error once and restores the helper", async () => {
		const announce = jest
			.spyOn(AccessibilityInfo, "announceForAccessibility")
			.mockImplementation(() => {});
		const view = await render(<ServerAddress />);
		expect(announce).not.toHaveBeenCalled();

		await view.rerender(
			<ServerAddress errorText="Enter a valid server URL." />,
		);

		expect(screen.getByText("Enter a valid server URL.")).toBeOnTheScreen();
		expect(announce).toHaveBeenCalledTimes(1);
		expect(announce).toHaveBeenLastCalledWith(
			"Server address. Enter a valid server URL.",
		);

		await view.rerender(
			<ServerAddress errorText="Enter a valid server URL." />,
		);

		expect(announce).toHaveBeenCalledTimes(1);

		await view.rerender(<ServerAddress />);

		expect(
			screen.getByText("Use the address of your server."),
		).toBeOnTheScreen();
		expect(screen.queryByText("Enter a valid server URL.")).toBeNull();
		expect(input("Server address").props.accessibilityHint).toBe(
			"Use the address of your server.",
		);

		await view.rerender(
			<ServerAddress errorText="Enter a valid server URL." />,
		);

		expect(announce).toHaveBeenCalledTimes(2);
	});

	it("is marked disabled and cannot be edited", async () => {
		const onValueChange = jest.fn();
		const view = await render(
			<ServerAddress disabled onValueChange={onValueChange} />,
		);

		expect(input("Server address").props.editable).toBe(false);
		expect(input("Server address").props.accessibilityState).toMatchObject({
			disabled: true,
		});
		expect(inputStyle("Server address")).toMatchObject({
			borderColor: "#D9D6D0",
			color: "#5C5C5C",
		});

		await fireEvent.changeText(
			input("Server address"),
			"https://other.example.com",
		);

		expect(onValueChange).not.toHaveBeenCalled();

		await view.rerender(<ServerAddress />);

		expect(input("Server address").props.editable).toBe(true);
		expect(inputStyle("Server address")).toMatchObject({
			borderColor: "#5C5C5C",
			borderWidth: 1,
			borderRadius: 12,
			paddingHorizontal: 16,
			backgroundColor: "#F6F5F2",
			color: "#171717",
			fontSize: 16,
			minHeight: 52,
		});

		await fireEvent(input("Server address"), "focus");

		expect(inputStyle("Server address")).toMatchObject({
			borderColor: "#B01A31",
		});

		await fireEvent(input("Server address"), "blur");

		expect(inputStyle("Server address")).toMatchObject({
			borderColor: "#5C5C5C",
		});
	});
});
