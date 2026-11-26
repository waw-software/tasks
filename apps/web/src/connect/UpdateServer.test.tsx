import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { UpdateServer, type UpdateServerProps } from "./UpdateServer.tsx";

afterEach(cleanup);

function view(props: Partial<UpdateServerProps> = {}) {
	return (
		<UpdateServer
			health={{ apiVersion: 1, capabilities: [] }}
			pending={false}
			onRetry={() => {}}
			onContinue={() => {}}
			{...props}
		/>
	);
}

function button(name: string) {
	return screen.getByRole<HTMLButtonElement>("button", { name });
}

test("REQ-010 AC-35 shows both API versions and the missing features", () => {
	const { container, rerender } = render(view());

	expect(
		screen.getByRole("heading", {
			level: 1,
			name: "Your server needs an update",
		}),
	).toBeDefined();
	expect(screen.getByText("Your server").parentElement?.textContent).toBe(
		"Your serverAPI v1",
	);
	expect(screen.getByText("This app supports").parentElement?.textContent).toBe(
		"This app supportsAPI v1",
	);
	expect(
		screen.getByRole("heading", { name: "Waiting for the update" }),
	).toBeDefined();
	expect(
		screen.getAllByRole("listitem").map((item) => item.textContent),
	).toEqual(["Connecting new devices"]);
	expect(container.querySelector("pre")?.textContent).toBe(
		"docker compose pull\ndocker compose up -d",
	);

	rerender(view({ health: { apiVersion: 1, capabilities: ["connect"] } }));

	expect(screen.queryByText("Waiting for the update")).toBeNull();
	expect(screen.queryByRole("listitem")).toBeNull();
});

test("REQ-010 AC-35 offers Check again and Continue with limited features", () => {
	const onRetry = vi.fn();
	const onContinue = vi.fn();
	const { rerender } = render(view({ onRetry, onContinue }));

	fireEvent.click(button("Check again"));
	expect([onRetry.mock.calls.length, onContinue.mock.calls.length]).toEqual([
		1, 0,
	]);
	fireEvent.click(button("Continue with limited features"));
	expect([onRetry.mock.calls.length, onContinue.mock.calls.length]).toEqual([
		1, 1,
	]);

	rerender(view({ onRetry, onContinue, pending: true }));

	expect(button("Check again").disabled).toBe(true);
});
