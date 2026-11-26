import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import {
	AccessibilityInfo,
	type findNodeHandle,
	Modal,
	type ModalProps,
	Pressable,
	Text,
} from "react-native";
import { type DismissReason, Sheet, type SheetProps } from "./Sheet";

function Example(props: Partial<SheetProps>) {
	return (
		<Sheet open title="New task" onDismiss={() => {}} {...props}>
			<Text>Pay rent every 1st</Text>
		</Sheet>
	);
}

function Footer() {
	const [added, setAdded] = useState(0);
	return (
		<>
			<Text>{`Added: ${added}`}</Text>
			<Pressable
				accessibilityRole="button"
				onPress={() => setAdded((count) => count + 1)}
			>
				<Text>Add task</Text>
			</Pressable>
		</>
	);
}

describe("Sheet", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("REQ-005 presentation: the sheet shows its title, content and footer", async () => {
		await render(<Example footer={<Footer />} />);

		expect(screen.getByRole("header", { name: "New task" })).toBeOnTheScreen();
		expect(screen.getByText("Pay rent every 1st")).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Add task" }));

		expect(screen.getByText("Added: 1")).toBeOnTheScreen();
	});

	it("DESIGN §8: close, escape and backdrop request dismissal", async () => {
		const reasons: DismissReason[] = [];
		const onDismiss = (reason: DismissReason) => {
			reasons.push(reason);
		};
		const { rerender } = await render(<Example onDismiss={onDismiss} />);
		// The surface is modal to VoiceOver, so the scrim beside it counts as hidden.
		const scrim = () =>
			screen.getByTestId("sheet-scrim", { includeHiddenElements: true });

		await fireEvent.press(screen.getByRole("button", { name: "Close sheet" }));
		expect(reasons).toEqual(["close"]);

		const [modal] = screen.container.queryAll((node) => node.type === "Modal");
		if (!modal) {
			throw new Error("The Sheet rendered no Modal");
		}
		await fireEvent(modal, "requestClose");
		expect(reasons).toEqual(["close", "escape"]);

		await fireEvent(screen.getByTestId("sheet-surface"), "accessibilityEscape");
		expect(reasons).toEqual(["close", "escape", "escape"]);

		await fireEvent.press(scrim());
		expect(reasons).toEqual(["close", "escape", "escape"]);

		await rerender(<Example onDismiss={onDismiss} dismissOnBackdrop />);
		await fireEvent.press(scrim());
		expect(reasons).toEqual(["close", "escape", "escape", "backdrop"]);

		expect(screen.getByRole("header", { name: "New task" })).toBeOnTheScreen();
		expect(screen.getByText("Pay rent every 1st")).toBeOnTheScreen();
	});

	it("after-close fires once after the native dismissal", async () => {
		// The Jest Modal drops its host as soon as it is hidden, so the native
		// dismissal is faked through the props of its latest render.
		const modalRender = jest.spyOn(Modal.prototype, "render");
		const dismissNatively = () =>
			act(() => {
				const latest = modalRender.mock.contexts.at(-1) as {
					props: ModalProps;
				};
				latest.props.onDismiss?.();
			});
		const onAfterClose = jest.fn();
		const { rerender } = await render(
			<Example open={false} onAfterClose={onAfterClose} />,
		);

		await dismissNatively();
		expect(onAfterClose).toHaveBeenCalledTimes(0);

		await rerender(<Example onAfterClose={onAfterClose} />);
		await dismissNatively();
		expect(onAfterClose).toHaveBeenCalledTimes(0);

		await rerender(<Example open={false} onAfterClose={onAfterClose} />);
		expect(onAfterClose).toHaveBeenCalledTimes(0);

		await dismissNatively();
		expect(onAfterClose).toHaveBeenCalledTimes(1);

		await dismissNatively();
		expect(onAfterClose).toHaveBeenCalledTimes(1);

		await rerender(<Example onAfterClose={onAfterClose} />);
		await rerender(<Example open={false} onAfterClose={onAfterClose} />);
		await dismissNatively();
		expect(onAfterClose).toHaveBeenCalledTimes(2);
	});

	it("DESIGN §8: the surface is a dialog", async () => {
		await render(<Example />);

		expect(screen.getByTestId("sheet-surface").props.role).toBe("dialog");
		expect(
			screen.getByTestId("sheet-surface").props.accessibilityViewIsModal,
		).toBe(true);
	});

	it("DESIGN §8: VoiceOver focus moves to the title once the sheet shows", async () => {
		const modalRender = jest.spyOn(Modal.prototype, "render");
		const setFocus = jest
			.spyOn(AccessibilityInfo, "setAccessibilityFocus")
			.mockImplementation(() => {});
		// The Jest renderer has no native node handles, so the lookup is faked.
		const findHandle = jest
			.fn<
				ReturnType<typeof findNodeHandle>,
				Parameters<typeof findNodeHandle>
			>()
			.mockReturnValue(42);
		jest
			.spyOn(require("react-native"), "findNodeHandle", "get")
			.mockReturnValue(findHandle);
		await render(<Example />);
		expect(setFocus).toHaveBeenCalledTimes(0);

		await act(() => {
			const latest = modalRender.mock.contexts.at(-1) as { props: ModalProps };
			latest.props.onShow?.({} as never);
		});

		expect(setFocus).toHaveBeenCalledTimes(1);
		expect(setFocus).toHaveBeenCalledWith(42);
		// The handle that gets the focus is the title's.
		expect(findHandle).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({ children: "New task" }),
			}),
		);
	});
});
