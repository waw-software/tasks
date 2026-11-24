import { render, screen } from "@testing-library/react-native";
import App from "./App";

describe("App", () => {
	it("REQ-001 AC-04: shows the WAW Tasks header", async () => {
		await render(<App />);

		expect(screen.getByRole("header", { name: "WAW Tasks" })).toBeOnTheScreen();
	});
});
