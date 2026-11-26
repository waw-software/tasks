import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import App from "./App.tsx";

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
	vi.unstubAllGlobals();
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

test("REQ-001 AC-03: Pickers opens only in a gallery build and Back returns", async () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	window.location.hash = "#/gallery/pickers";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");
	cleanup();

	vi.stubEnv("VITE_WAW_GALLERY", "1");

	render(<App />);
	expect(levelOneHeading()).toBe("Pickers");
	cleanup();

	window.location.hash = "";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");

	changeHash("#/gallery");
	expect(levelOneHeading()).toBe("Component gallery");

	await followLink("Pickers", "Pickers");
	await followLink("Back", "Component gallery");

	changeHash("#/gallery/pickersx");
	expect(levelOneHeading()).toBe("WAW Tasks");
});

test("REQ-001 AC-03: Navigation opens only in a gallery build and Back returns", async () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	window.location.hash = "#/gallery/navigation";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");
	cleanup();

	vi.stubEnv("VITE_WAW_GALLERY", "1");

	render(<App />);
	expect(levelOneHeading()).toBe("Navigation");
	cleanup();

	window.location.hash = "";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");

	changeHash("#/gallery");
	expect(levelOneHeading()).toBe("Component gallery");

	await followLink("Navigation", "Navigation");
	await followLink("Back", "Component gallery");

	changeHash("#/gallery/navigationx");
	expect(levelOneHeading()).toBe("WAW Tasks");
});

test("REQ-001 AC-03: a dev build opens #/gallery/controls directly", () => {
	vi.stubEnv("DEV", true);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	window.location.hash = "#/gallery/controls";

	render(<App />);

	expect(levelOneHeading()).toBe("Controls");
});

test("REQ-001 AC-03: Overlays and its quick-add route open only in a gallery build", async () => {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: 1440 < Number(/\d+/.exec(query)?.[0]),
		addEventListener: () => {},
		removeEventListener: () => {},
	}));
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	for (const hash of ["#/gallery/overlays", "#/gallery/overlays/quick-add"]) {
		window.location.hash = hash;
		render(<App />);
		expect(levelOneHeading()).toBe("WAW Tasks");
		expect(screen.queryByRole("dialog")).toBeNull();
		cleanup();
	}

	vi.stubEnv("VITE_WAW_GALLERY", "1");
	window.location.hash = "#/gallery/overlays";
	render(<App />);
	expect(levelOneHeading()).toBe("Overlays");
	expect(screen.queryByRole("dialog")).toBeNull();
	cleanup();

	window.location.hash = "#/gallery/overlays/quick-add";
	render(<App />);
	expect(screen.getByRole("dialog", { name: "New task" })).toBeDefined();
	cleanup();

	window.location.hash = "";
	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");

	changeHash("#/gallery");
	await followLink("Overlays", "Overlays");
	await followLink("Back", "Component gallery");

	// A change of route between the two pages opens and drops the overlay.
	changeHash("#/gallery/overlays");
	changeHash("#/gallery/overlays/quick-add");
	expect(screen.getByRole("dialog", { name: "New task" })).toBeDefined();
	changeHash("#/gallery/overlays");
	expect(screen.queryByRole("dialog")).toBeNull();

	for (const hash of ["#/gallery/overlaysx", "#/gallery/overlays/quick-addx"]) {
		changeHash(hash);
		expect(levelOneHeading()).toBe("WAW Tasks");
	}
});

test("REQ-011 AC-39: App: /setup opens the setup page", () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	window.history.pushState(null, "", "/setup");

	render(<App />);

	expect(levelOneHeading()).toBe("Set up WAW Tasks");
	window.history.pushState(null, "", "/");
});

test("REQ-011 AC-39: App: #/gallery/setup shows the revealed sample only in a gallery build", () => {
	vi.stubEnv("DEV", false);
	vi.stubEnv("VITE_WAW_GALLERY", undefined);
	window.location.hash = "#/gallery/setup";

	render(<App />);
	expect(levelOneHeading()).toBe("WAW Tasks");
	expect(screen.queryByLabelText("Access token")).toBeNull();
	cleanup();

	vi.stubEnv("VITE_WAW_GALLERY", "1");

	render(<App />);
	expect(levelOneHeading()).toBe("Connect your devices");
	expect(
		screen.getByLabelText<HTMLTextAreaElement>("Server address").value,
	).toBe("https://tasks.example.com");
	expect(screen.getByLabelText<HTMLTextAreaElement>("Access token").value).toBe(
		`waw_dev_${"A".repeat(43)}`,
	);
	expect(screen.getByLabelText<HTMLTextAreaElement>("Pairing link").value).toBe(
		`https://tasks.example.com/pair#token=waw_pair_${"B".repeat(43)}`,
	);
	expect(
		screen.getByRole("img", { name: "QR code for the pairing link" }),
	).toBeDefined();
});
