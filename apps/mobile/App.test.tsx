import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import App from "./App";

const mockUseAppFonts = jest.fn<[boolean, Error | null], []>();

jest.mock("./src/fonts", () => ({
	...jest.requireActual("./src/fonts"),
	useAppFonts: () => mockUseAppFonts(),
}));

const galleryUrl = "exp://127.0.0.1:8081/--/gallery";

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
