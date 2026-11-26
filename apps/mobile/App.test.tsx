import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import App, { galleryRoute } from "./App";

const mockUseAppFonts = jest.fn<[boolean, Error | null], []>();

jest.mock("./src/fonts", () => ({
	...jest.requireActual("./src/fonts"),
	useAppFonts: () => mockUseAppFonts(),
}));

const galleryUrl = "exp://127.0.0.1:8081/--/gallery";
const rowsUrl = "exp://127.0.0.1:8081/--/gallery/rows";
const controlsUrl = "exp://127.0.0.1:8081/--/gallery/controls";
const pickersUrl = "exp://127.0.0.1:8081/--/gallery/pickers";
const navigationUrl = "exp://127.0.0.1:8081/--/gallery/navigation";
const overlaysUrl = "exp://127.0.0.1:8081/--/gallery/overlays";
const quickAddUrl = "exp://127.0.0.1:8081/--/gallery/overlays/quick-add";

describe("App", () => {
	beforeEach(() => {
		mockUseAppFonts.mockReturnValue([true, null]);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		// The preset's Linking methods are already mocks, which restoring leaves as they are.
		jest.mocked(Linking.getInitialURL).mockResolvedValue(null);
	});

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

	it("REQ-001 AC-04: a dev build opens the gallery from the gallery link; without __DEV__ the button and the link are ignored", async () => {
		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(galleryUrl);
		const dev = await render(<App />);

		expect(
			await screen.findByRole("header", { name: "Component gallery" }),
		).toBeOnTheScreen();

		await dev.unmount();
		const globals = globalThis as unknown as { __DEV__: boolean };
		const wasDev = globals.__DEV__;
		globals.__DEV__ = false;
		try {
			await render(<App />);

			expect(
				screen.getByRole("header", { name: "WAW Tasks" }),
			).toBeOnTheScreen();
			expect(
				screen.queryByRole("button", { name: "Component gallery" }),
			).toBeNull();
			expect(
				screen.queryByRole("header", { name: "Component gallery" }),
			).toBeNull();
		} finally {
			globals.__DEV__ = wasDev;
		}
	});

	it("REQ-001 AC-04: a gallery link while the app is open opens the gallery", async () => {
		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
		const listen = jest.spyOn(Linking, "addEventListener");
		await render(<App />);
		const onUrl = listen.mock.lastCall?.[1];
		if (!onUrl) {
			throw new Error("the app does not listen for links");
		}

		await act(() => onUrl({ url: "exp://127.0.0.1:8081" }));

		expect(screen.getByRole("header", { name: "WAW Tasks" })).toBeOnTheScreen();

		await act(() => onUrl({ url: galleryUrl }));

		expect(
			screen.getByRole("header", { name: "Component gallery" }),
		).toBeOnTheScreen();
	});

	it("REQ-001 AC-04: the gallery opens Task rows and Back returns to the gallery", async () => {
		await render(<App />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Component gallery" }),
		);

		await fireEvent.press(screen.getByRole("button", { name: "Task rows" }));

		expect(
			screen.getByRole("header", { name: "Task row gallery" }),
		).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(
			screen.getByRole("header", { name: "Component gallery" }),
		).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(screen.getByRole("header", { name: "WAW Tasks" })).toBeOnTheScreen();
	});

	it("REQ-001 AC-04: the rows link opens Task rows in development only", async () => {
		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(rowsUrl);
		const dev = await render(<App />);

		expect(
			await screen.findByRole("header", { name: "Task row gallery" }),
		).toBeOnTheScreen();

		await dev.unmount();
		const globals = globalThis as unknown as { __DEV__: boolean };
		const wasDev = globals.__DEV__;
		globals.__DEV__ = false;
		try {
			const release = await render(<App />);

			expect(
				screen.getByRole("header", { name: "WAW Tasks" }),
			).toBeOnTheScreen();
			expect(
				screen.queryByRole("header", { name: "Task row gallery" }),
			).toBeNull();
			await release.unmount();
		} finally {
			globals.__DEV__ = wasDev;
		}

		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
		const listen = jest.spyOn(Linking, "addEventListener");
		await render(<App />);
		const onUrl = listen.mock.lastCall?.[1];
		if (!onUrl) {
			throw new Error("the app does not listen for links");
		}

		await act(() =>
			onUrl({ url: "exp://127.0.0.1:8081/?next=/--/gallery/rows" }),
		);

		expect(screen.getByRole("header", { name: "WAW Tasks" })).toBeOnTheScreen();

		await act(() => onUrl({ url: rowsUrl }));

		expect(
			screen.getByRole("header", { name: "Task row gallery" }),
		).toBeOnTheScreen();
	});

	it("REQ-001 AC-04: Controls opens from the gallery or a dev link and Back returns", async () => {
		const shell = await render(<App />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Component gallery" }),
		);

		await fireEvent.press(screen.getByRole("button", { name: "Controls" }));

		expect(screen.getByRole("header", { name: "Controls" })).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(
			screen.getByRole("header", { name: "Component gallery" }),
		).toBeOnTheScreen();

		await shell.unmount();
		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(controlsUrl);
		const dev = await render(<App />);

		expect(
			await screen.findByRole("header", { name: "Controls" }),
		).toBeOnTheScreen();

		await dev.unmount();
		const globals = globalThis as unknown as { __DEV__: boolean };
		const wasDev = globals.__DEV__;
		globals.__DEV__ = false;
		try {
			const release = await render(<App />);

			expect(
				screen.getByRole("header", { name: "WAW Tasks" }),
			).toBeOnTheScreen();
			expect(screen.queryByRole("header", { name: "Controls" })).toBeNull();
			await release.unmount();
		} finally {
			globals.__DEV__ = wasDev;
		}

		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
		const listen = jest.spyOn(Linking, "addEventListener");
		await render(<App />);
		const onUrl = listen.mock.lastCall?.[1];
		if (!onUrl) {
			throw new Error("the app does not listen for links");
		}

		await act(() => onUrl({ url: controlsUrl }));

		expect(screen.getByRole("header", { name: "Controls" })).toBeOnTheScreen();

		expect(galleryRoute(controlsUrl)).toBe("controls");
		for (const url of [
			"exp://127.0.0.1:8081/--/gallery/controlsx",
			"exp://127.0.0.1:8081/--/gallery/controls/more",
			"exp://127.0.0.1:8081/?next=/--/gallery/controls",
		]) {
			expect(galleryRoute(url)).toBeNull();
		}
	});

	it("REQ-001 AC-04: Pickers opens from the gallery or a dev link and Back returns", async () => {
		const shell = await render(<App />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Component gallery" }),
		);

		await fireEvent.press(screen.getByRole("button", { name: "Pickers" }));

		expect(screen.getByRole("header", { name: "Pickers" })).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(
			screen.getByRole("header", { name: "Component gallery" }),
		).toBeOnTheScreen();

		await shell.unmount();
		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(pickersUrl);
		const dev = await render(<App />);

		expect(
			await screen.findByRole("header", { name: "Pickers" }),
		).toBeOnTheScreen();

		await dev.unmount();
		const globals = globalThis as unknown as { __DEV__: boolean };
		const wasDev = globals.__DEV__;
		globals.__DEV__ = false;
		try {
			const release = await render(<App />);

			expect(
				screen.getByRole("header", { name: "WAW Tasks" }),
			).toBeOnTheScreen();
			expect(screen.queryByRole("header", { name: "Pickers" })).toBeNull();
			await release.unmount();
		} finally {
			globals.__DEV__ = wasDev;
		}

		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
		const listen = jest.spyOn(Linking, "addEventListener");
		await render(<App />);
		const onUrl = listen.mock.lastCall?.[1];
		if (!onUrl) {
			throw new Error("the app does not listen for links");
		}

		await act(() => onUrl({ url: pickersUrl }));

		expect(screen.getByRole("header", { name: "Pickers" })).toBeOnTheScreen();

		expect(galleryRoute(pickersUrl)).toBe("pickers");
		for (const url of [
			"exp://127.0.0.1:8081/--/gallery/pickersx",
			"exp://127.0.0.1:8081/--/gallery/pickers/more",
			"exp://127.0.0.1:8081/?next=/--/gallery/pickers",
		]) {
			expect(galleryRoute(url)).toBeNull();
		}
	});

	it("REQ-001 AC-04: Navigation opens from the gallery or a dev link and Back returns", async () => {
		const shell = await render(<App />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Component gallery" }),
		);

		await fireEvent.press(screen.getByRole("button", { name: "Navigation" }));

		expect(
			screen.getByRole("header", { name: "Navigation" }),
		).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(
			screen.getByRole("header", { name: "Component gallery" }),
		).toBeOnTheScreen();

		await shell.unmount();
		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(navigationUrl);
		const dev = await render(<App />);

		expect(
			await screen.findByRole("header", { name: "Navigation" }),
		).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(
			screen.getByRole("header", { name: "Component gallery" }),
		).toBeOnTheScreen();

		await dev.unmount();
		const globals = globalThis as unknown as { __DEV__: boolean };
		const wasDev = globals.__DEV__;
		globals.__DEV__ = false;
		try {
			const release = await render(<App />);

			expect(
				screen.getByRole("header", { name: "WAW Tasks" }),
			).toBeOnTheScreen();
			expect(screen.queryByRole("header", { name: "Navigation" })).toBeNull();
			await release.unmount();
		} finally {
			globals.__DEV__ = wasDev;
		}

		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
		const listen = jest.spyOn(Linking, "addEventListener");
		await render(<App />);
		const onUrl = listen.mock.lastCall?.[1];
		if (!onUrl) {
			throw new Error("the app does not listen for links");
		}

		await act(() => onUrl({ url: navigationUrl }));

		expect(
			screen.getByRole("header", { name: "Navigation" }),
		).toBeOnTheScreen();

		expect(galleryRoute(navigationUrl)).toBe("navigation");
		for (const url of [
			"exp://127.0.0.1:8081/--/gallery/navigationx",
			"exp://127.0.0.1:8081/--/gallery/navigation/more",
			"exp://127.0.0.1:8081/?next=/--/gallery/navigation",
		]) {
			expect(galleryRoute(url)).toBeNull();
		}
	});

	it("REQ-001 AC-04: Overlays opens from the gallery or a dev link and Back returns", async () => {
		const overlays = () => screen.queryByRole("header", { name: "Overlays" });
		const sheet = () => screen.queryByRole("header", { name: "New task" });
		const back = () =>
			fireEvent.press(screen.getByRole("button", { name: "Back" }));
		const cancel = () =>
			fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
		const expectGallery = () =>
			expect(
				screen.getByRole("header", { name: "Component gallery" }),
			).toBeOnTheScreen();
		const shell = await render(<App />);
		await fireEvent.press(
			screen.getByRole("button", { name: "Component gallery" }),
		);

		await fireEvent.press(screen.getByRole("button", { name: "Overlays" }));

		expect(overlays()).toBeOnTheScreen();
		expect(sheet()).toBeNull();

		await back();

		expectGallery();

		await shell.unmount();
		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(overlaysUrl);
		const hub = await render(<App />);

		expect(
			await screen.findByRole("header", { name: "Overlays" }),
		).toBeOnTheScreen();
		expect(sheet()).toBeNull();

		await back();

		expectGallery();

		await hub.unmount();
		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(quickAddUrl);
		const direct = await render(<App />);

		expect(
			await screen.findByRole("header", { name: "New task" }),
		).toBeOnTheScreen();

		await cancel();

		expect(sheet()).toBeNull();
		expect(overlays()).toBeOnTheScreen();

		await back();

		expectGallery();

		await direct.unmount();
		const globals = globalThis as unknown as { __DEV__: boolean };
		const wasDev = globals.__DEV__;
		globals.__DEV__ = false;
		try {
			const release = await render(<App />);

			expect(
				screen.getByRole("header", { name: "WAW Tasks" }),
			).toBeOnTheScreen();
			expect(overlays()).toBeNull();
			expect(sheet()).toBeNull();
			await release.unmount();
		} finally {
			globals.__DEV__ = wasDev;
		}

		jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
		const listen = jest.spyOn(Linking, "addEventListener");
		await render(<App />);
		const onUrl = listen.mock.lastCall?.[1];
		if (!onUrl) {
			throw new Error("the app does not listen for links");
		}

		await act(() => onUrl({ url: overlaysUrl }));

		expect(overlays()).toBeOnTheScreen();
		expect(sheet()).toBeNull();

		await act(() => onUrl({ url: quickAddUrl }));

		expect(sheet()).toBeOnTheScreen();

		await cancel();
		await act(() => onUrl({ url: quickAddUrl }));

		expect(sheet()).toBeOnTheScreen();

		await act(() => onUrl({ url: overlaysUrl }));

		expect(sheet()).toBeNull();
		expect(overlays()).toBeOnTheScreen();

		expect(galleryRoute(overlaysUrl)).toBe("overlays");
		expect(galleryRoute(quickAddUrl)).toBe("overlays-quick-add");
		for (const url of [
			"exp://127.0.0.1:8081/--/gallery/overlaysx",
			"exp://127.0.0.1:8081/--/gallery/overlays/more",
			"exp://127.0.0.1:8081/--/gallery/overlays/quick-addx",
			"exp://127.0.0.1:8081/--/gallery/overlays/quick-add/more",
			"exp://127.0.0.1:8081/?next=/--/gallery/overlays",
			"exp://127.0.0.1:8081/?next=/--/gallery/overlays/quick-add",
		]) {
			expect(galleryRoute(url)).toBeNull();
		}
	});

	it("REQ-001 AC-04: only the exact gallery paths are gallery routes", () => {
		expect(galleryRoute(galleryUrl)).toBe("components");
		expect(galleryRoute(rowsUrl)).toBe("rows");
		expect(galleryRoute(`${rowsUrl}?from=test#top`)).toBe("rows");
		for (const url of [
			"exp://127.0.0.1:8081/--/gallery/rowsx",
			"exp://127.0.0.1:8081/--/gallery/rows/more",
			"exp://127.0.0.1:8081/?next=/--/gallery/rows",
			"exp://127.0.0.1:8081/#/--/gallery",
			"not a url",
			null,
		]) {
			expect(galleryRoute(url)).toBeNull();
		}
	});

	it("REQ-001 AC-04: the shell waits for the fonts and starts when they load or fail", async () => {
		const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
		mockUseAppFonts.mockReturnValue([false, null]);
		const app = await render(<App />);

		expect(screen.queryByRole("header", { name: "WAW Tasks" })).toBeNull();

		mockUseAppFonts.mockReturnValue([true, null]);
		await app.rerender(<App />);

		expect(screen.getByRole("header", { name: "WAW Tasks" })).toBeOnTheScreen();
		expect(warn).not.toHaveBeenCalled();

		await app.unmount();
		const error = new Error("font unavailable");
		mockUseAppFonts.mockReturnValue([false, error]);
		const failed = await render(<App />);
		await failed.rerender(<App />);

		expect(screen.getByRole("header", { name: "WAW Tasks" })).toBeOnTheScreen();
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(expect.any(String), error);
	});
});
