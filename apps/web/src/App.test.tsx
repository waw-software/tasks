import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App from "./App.tsx";

afterEach(() => {
	vi.unstubAllEnvs();
	window.location.hash = "";
	cleanup();
});

test("REQ-001 AC-03: shows the WAW Tasks heading", () => {
	render(<App />);

	const heading = screen.getByRole("heading", { level: 1, name: "WAW Tasks" });

	expect(heading.textContent).toBe("WAW Tasks");
});

function changeHash(hash: string) {
	act(() => {
		window.location.hash = hash;
		window.dispatchEvent(new HashChangeEvent("hashchange"));
	});
}

function levelOneHeading() {
	return screen.getByRole("heading", { level: 1 }).textContent;
}

test("REQ-001 AC-03: a normal build shows the shell at #/gallery", () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", "0");
	window.location.hash = "#/gallery";

	render(<App />);

	expect(levelOneHeading()).toBe("WAW Tasks");
	expect(screen.queryByText("Component gallery")).toBeNull();
});

test("REQ-001 AC-03: a gallery build opens the gallery on hash change and returns to the shell", () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", "1");
	window.location.hash = "";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");

	changeHash("#/gallery");
	expect(levelOneHeading()).toBe("Component gallery");

	changeHash("");
	expect(levelOneHeading()).toBe("WAW Tasks");
});
