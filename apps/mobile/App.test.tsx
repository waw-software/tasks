import { fireEvent, render, screen } from "@testing-library/react-native";
import App from "./App";

describe("App", () => {
	it("REQ-001 AC-04: shows the WAW Tasks header", async () => {
		await render(<App />);

		expect(screen.getByRole("header", { name: "WAW Tasks" })).toBeOnTheScreen();
	});

	it("REQ-001 AC-04: the dev shell opens the gallery and Back returns", async () => {
		await render(<App />);

		await fireEvent.press(
			screen.getByRole("button", { name: "Component gallery" }),
		);

		expect(
			screen.getByRole("header", { name: "Component gallery" }),
		).toBeOnTheScreen();
		expect(screen.getByText("Work")).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(screen.getByRole("header", { name: "WAW Tasks" })).toBeOnTheScreen();
	});

	it("REQ-001 AC-04: without __DEV__ the shell has no gallery button", async () => {
		const globals = globalThis as unknown as { __DEV__: boolean };
		const dev = globals.__DEV__;
		globals.__DEV__ = false;
		try {
			await render(<App />);

			expect(
				screen.getByRole("header", { name: "WAW Tasks" }),
			).toBeOnTheScreen();
			expect(
				screen.queryByRole("button", { name: "Component gallery" }),
			).toBeNull();
		} finally {
			globals.__DEV__ = dev;
		}
	});
});
