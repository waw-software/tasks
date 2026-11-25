import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Modal, type ModalProps } from "react-native";
import OverlaysGallery from "./OverlaysGallery";

const sentence = "Pay rent every 1st at 9:00 p1 #Home @money";

const press = (name: string) =>
	fireEvent.press(screen.getByRole("button", { name }));
const sheet = () => screen.queryByRole("header", { name: "New task" });

describe("OverlaysGallery", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("REQ-005 presentation: the quick-add sheet opens with the parsed parts and closes", async () => {
		await render(<OverlaysGallery />);
		expect(sheet()).toBeNull();
		expect(screen.queryByText("Selected: Add task")).toBeNull();

		await press("Quick add");

		expect(sheet()).toBeOnTheScreen();
		expect(screen.getByTestId("input-Task").props.value).toBe(sentence);
		for (const text of [
			"Understood as",
			"Every month on the 1st",
			"09:00",
			"Priority 1",
			"Home",
			"@money",
			"Type it the way you say it: dates, p1 to p4, #project, @label.",
		]) {
			expect(screen.getByText(text)).toBeOnTheScreen();
		}

		await fireEvent.changeText(screen.getByTestId("input-Task"), "Buy milk");

		expect(screen.getByTestId("input-Task").props.value).toBe("Buy milk");

		await press("Cancel");

		expect(sheet()).toBeNull();
		expect(screen.queryByText("Selected: Add task")).toBeNull();

		await press("Quick add");
		await press("Add task");

		expect(sheet()).toBeNull();
		expect(screen.getByText("Selected: Add task")).toBeOnTheScreen();
	});

	it("DESIGN §8: the quick-add launcher gets accessibility focus after the sheet has closed", async () => {
		// The Jest Modal drops its host as soon as it is hidden, so the native
		// dismissal is faked through the props of its latest render. The test
		// renderer has no native tags, so the tag lookup is faked too.
		const modalRender = jest.spyOn(Modal.prototype, "render");
		const dismissNatively = () =>
			act(() => {
				const latest = modalRender.mock.contexts.at(-1) as {
					props: ModalProps;
				};
				latest.props.onDismiss?.();
			});
		// The getter lives on the module itself; an import namespace is a copy.
		const reactNative =
			jest.requireActual<typeof import("react-native")>("react-native");
		const findNodeHandle = jest
			.spyOn(reactNative, "findNodeHandle")
			.mockReturnValue(42);
		const focus = jest
			.spyOn(AccessibilityInfo, "setAccessibilityFocus")
			.mockImplementation(() => {});
		await render(<OverlaysGallery quickAddOpen />);
		let closes = 0;

		for (const name of ["Cancel", "Close sheet"]) {
			if (closes > 0) {
				await press("Quick add");
			}
			await press(name);

			expect(sheet()).toBeNull();
			expect(focus).toHaveBeenCalledTimes(closes);

			await dismissNatively();
			closes += 1;

			expect(focus).toHaveBeenCalledTimes(closes);
			expect(focus).toHaveBeenLastCalledWith(42);
		}
		expect(findNodeHandle.mock.lastCall?.[0]).not.toBeNull();
	});
});
