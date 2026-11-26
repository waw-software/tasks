import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ConnectError } from "@waw/api-contract/connect";
import { afterEach, expect, test, vi } from "vitest";
import { ConnectView, type ConnectViewProps } from "./ConnectView.tsx";

afterEach(cleanup);

const serverUrl = "https://tasks.example.com";
// Spaces around it: the view hands over the text as typed.
const typed = `  waw_dev_${"c".repeat(43)} `;

function view(props: Partial<ConnectViewProps> = {}) {
	return (
		<ConnectView
			serverUrl={serverUrl}
			pending={false}
			onSubmit={() => {}}
			{...props}
		/>
	);
}

function tokenField() {
	return screen.getByLabelText<HTMLInputElement>("Access token");
}

function connectButton() {
	return screen.getByRole<HTMLButtonElement>("button", { name: "Connect" });
}

function enterToken(value: string) {
	fireEvent.change(tokenField(), { target: { value } });
}

// jsdom has no implicit submission, so the form is submitted as Enter would.
function submitForm() {
	const { form } = tokenField();
	if (!form) throw new Error("the token field is in no form");
	fireEvent.submit(form);
}

test("REQ-007 AC-28 asks only for the access token on the server's own origin", () => {
	const onSubmit = vi.fn();
	const { container } = render(view({ onSubmit }));

	expect(
		screen.getByRole("heading", { level: 1, name: "Connect to your server" }),
	).toBeDefined();
	expect(container.querySelectorAll("input, textarea")).toHaveLength(1);
	expect(tokenField().getAttribute("type")).toBe("password");
	expect(screen.queryByLabelText(/Server URL/)).toBeNull();
	expect(screen.getByText(serverUrl)).toBeDefined();
	expect(
		screen.getByText(
			"docker compose exec server node dist/auth/token-cli.js issue",
		),
	).toBeDefined();

	enterToken(typed);
	fireEvent.click(connectButton());

	expect(onSubmit.mock.calls).toEqual([
		[{ kind: "manual", serverUrl, token: typed }],
	]);
});

test("REQ-007 AC-28 submits the token on Enter", () => {
	const onSubmit = vi.fn();
	render(view({ onSubmit }));

	enterToken(typed);
	submitForm();

	expect(onSubmit.mock.calls).toEqual([
		[{ kind: "manual", serverUrl, token: typed }],
	]);
});

test("REQ-007 AC-28 submits nothing while the field is empty or a sign-in is pending", () => {
	const onSubmit = vi.fn();
	const { rerender } = render(view({ onSubmit }));

	expect(connectButton().disabled).toBe(true);
	enterToken("   ");
	expect(connectButton().disabled).toBe(true);
	submitForm();

	enterToken(typed);
	expect(connectButton().disabled).toBe(false);
	rerender(view({ onSubmit, pending: true }));
	expect(connectButton().disabled).toBe(true);
	submitForm();

	expect(onSubmit.mock.calls).toEqual([]);
});

test.each<[ConnectError, string]>([
	["invalid-token", "That is not an access token. It starts with waw_dev_."],
	[
		"unauthorized",
		"This token is not valid on this server. It may have been revoked.",
	],
	["https-required", "Open this page over HTTPS to sign in."],
	["csrf-forbidden", "Sign-in was refused. Reload the page and try again."],
	["unreachable", "The server did not answer. Try again."],
	["invalid-response", "Something went wrong. Try again."],
	["storage", "Something went wrong. Try again."],
])("shows a usable message for each refusal: %s", (error, message) => {
	const { rerender } = render(view());
	enterToken(typed);

	rerender(view({ error }));

	expect(screen.getByRole("alert").textContent).toBe(message);
	expect(tokenField().getAttribute("aria-invalid")).toBe("true");
	expect(tokenField().value).toBe(typed);
});
