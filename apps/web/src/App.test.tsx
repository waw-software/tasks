import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
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

test("REQ-001 AC-03: only a gallery build opens #/gallery; a normal build keeps the shell", () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	expect(import.meta.env.VITE_WAW_GALLERY).toBeUndefined();
	window.location.hash = "#/gallery";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");
	expect(screen.queryByText("Component gallery")).toBeNull();
	cleanup();

	vi.stubEnv("VITE_WAW_GALLERY", "1");
	window.location.hash = "";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");

	changeHash("#/gallery");
	expect(levelOneHeading()).toBe("Component gallery");

	changeHash("");
	expect(levelOneHeading()).toBe("WAW Tasks");
});

async function followLink(name: string, heading: string) {
	// jsdom navigates to the fragment and fires hashchange asynchronously.
	fireEvent.click(screen.getByRole("link", { name }));
	await screen.findByRole("heading", { level: 1, name: heading });
}

test("REQ-001 AC-03: only a gallery build opens #/gallery/rows", async () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	window.location.hash = "#/gallery/rows";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");
	cleanup();

	vi.stubEnv("VITE_WAW_GALLERY", "1");
	window.location.hash = "";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");

	changeHash("#/gallery");
	expect(levelOneHeading()).toBe("Component gallery");

	await followLink("Task rows", "Task row gallery");
	await followLink("Back", "Component gallery");

	changeHash("#/gallery/rowsx");
	expect(levelOneHeading()).toBe("WAW Tasks");
});

test("REQ-001 AC-03: Controls opens only in a gallery build and Back returns", async () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	window.location.hash = "#/gallery/controls";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");
	cleanup();

	vi.stubEnv("VITE_WAW_GALLERY", "1");

	render(<App />);
	expect(levelOneHeading()).toBe("Controls");
	cleanup();

	window.location.hash = "";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");

	changeHash("#/gallery");
	expect(levelOneHeading()).toBe("Component gallery");

	await followLink("Controls", "Controls");
	await followLink("Back", "Component gallery");

	changeHash("#/gallery/controlsx");
	expect(levelOneHeading()).toBe("WAW Tasks");
});
