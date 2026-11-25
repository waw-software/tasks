import { fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet } from "react-native";
import { Banner } from "./Banner";

function bannerStyle(tone: string) {
	return StyleSheet.flatten(screen.getByTestId(`banner-${tone}`).props.style);
}

describe("Banner", () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("exposes the banner copy and Retry separately", async () => {
		const onRetry = jest.fn();
		await render(
			<Banner
				tone="warning"
				title="Working offline"
				message="3 changes are waiting to sync."
				action={{ label: "Retry", onPress: onRetry }}
			/>,
		);

		const copy = screen.getByLabelText(
			"Working offline. 3 changes are waiting to sync.",
		);
		expect(copy.props.accessible).toBe(true);
		expect(copy.props.accessibilityRole).toBe("text");
		expect(screen.getByText("Working offline")).toBeOnTheScreen();
		expect(
			screen.getByText("3 changes are waiting to sync."),
		).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "Retry" }));

		expect(onRetry).toHaveBeenCalledTimes(1);
		expect(bannerStyle("warning")).toMatchObject({
			backgroundColor: "#FBF3E2",
			borderRadius: 14,
		});
		expect(
			StyleSheet.flatten(screen.getByTestId("banner-action").props.style),
		).toMatchObject({ alignSelf: "flex-end" });
	});

	it("announces a changed result once", async () => {
		const announce = jest
			.spyOn(AccessibilityInfo, "announceForAccessibilityWithOptions")
			.mockImplementation(() => {});
		announce.mockClear();
		const view = await render(
			<Banner
				tone="warning"
				title="Working offline"
				message="3 changes are waiting to sync."
				action={{ label: "Retry", onPress: jest.fn() }}
			/>,
		);
		expect(announce).not.toHaveBeenCalled();

		await view.rerender(
			<Banner tone="success" title="Server reachable · API v1" />,
		);

		expect(announce.mock.calls).toEqual([
			["Server reachable · API v1", { queue: true }],
		]);
		expect(screen.getByText("Server reachable · API v1")).toBeOnTheScreen();
		expect(screen.queryByRole("button")).toBeNull();
		expect(bannerStyle("success")).toMatchObject({
			backgroundColor: "#EEF6F1",
			borderRadius: 12,
		});

		await view.rerender(
			<Banner tone="success" title="Server reachable · API v1" />,
		);

		expect(announce).toHaveBeenCalledTimes(1);
	});
});
