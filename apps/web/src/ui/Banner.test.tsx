import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Banner } from "./Banner.tsx";

afterEach(() => {
	cleanup();
});

function bannerOf(status: HTMLElement): HTMLElement | null {
	return status.closest<HTMLElement>("[data-tone]");
}

test("keeps status copy and its text-button action independently accessible", () => {
	const onPress = vi.fn();
	render(
		<Banner
			tone="warning"
			title="Working offline"
			message="3 changes are waiting to sync."
			action={{ label: "Retry", onPress }}
		/>,
	);

	const status = screen.getByRole("status");
	expect(status.textContent).toContain("Working offline");
	expect(status.textContent).toContain("3 changes are waiting to sync.");
	expect(status.textContent).not.toContain("Retry");

	fireEvent.click(screen.getByRole("button", { name: "Retry" }));
	expect(onPress).toHaveBeenCalledTimes(1);

	expect(bannerOf(status)?.style.backgroundColor).toBe("rgb(251, 243, 226)");
});

test("renders a success result without an action", () => {
	const { rerender } = render(
		<Banner
			tone="warning"
			title="Working offline"
			action={{ label: "Retry", onPress: () => {} }}
		/>,
	);
	const status = screen.getByRole("status");

	rerender(<Banner tone="success" title="Server reachable · API v1" />);

	expect(screen.getByRole("status")).toBe(status);
	expect(status.textContent).toBe("Server reachable · API v1");
	expect(screen.queryByRole("button")).toBeNull();
	expect(bannerOf(status)?.style.backgroundColor).toBe("rgb(238, 246, 241)");
	expect(screen.getByText("Server reachable · API v1").style.color).toBe(
		"rgb(27, 105, 67)",
	);
});

test("update tone uses the accent tint", () => {
	render(<Banner tone="update" title="Your server needs an update" />);

	expect(bannerOf(screen.getByRole("status"))?.style.backgroundColor).toBe(
		"rgb(252, 235, 238)",
	);
});
