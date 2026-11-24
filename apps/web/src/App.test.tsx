import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import App from "./App.tsx";

afterEach(() => {
	cleanup();
});

test("REQ-001 AC-03: shows the WAW Tasks heading", () => {
	render(<App />);

	const heading = screen.getByRole("heading", { level: 1, name: "WAW Tasks" });

	expect(heading.textContent).toBe("WAW Tasks");
});
