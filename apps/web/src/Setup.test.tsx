import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Setup } from "./Setup.tsx";

afterEach(() => {
	vi.unstubAllGlobals();
	cleanup();
});

const claimed = {
	serverUrl: "https://tasks.example.com",
	accessToken: `waw_dev_${"c".repeat(43)}`,
	pairingLink: `https://tasks.example.com/pair#token=waw_pair_${"d".repeat(43)}`,
	qrDataUrl: "data:image/png;base64,AAAA",
};

function respond(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function submitButton() {
	return screen.getByRole<HTMLButtonElement>("button", {
		name: "Show access token",
	});
}

function enterCode(code: string) {
	fireEvent.change(screen.getByLabelText("Setup code"), {
		target: { value: code },
	});
}

test("REQ-011 AC-39: asks for the setup code and keeps the button disabled until one is entered", () => {
	const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
	vi.stubGlobal("fetch", fetchMock);

	render(<Setup />);

	expect(
		screen.getByRole("heading", { level: 1, name: "Set up WAW Tasks" }),
	).toBeDefined();
	expect(screen.getByText("docker compose logs server")).toBeDefined();
	expect(screen.getByLabelText("Setup code").getAttribute("type")).toBe(
		"password",
	);
	expect(submitButton().disabled).toBe(true);

	enterCode("setup-code");
	expect(submitButton().disabled).toBe(false);

	// While the claim is pending, a second one cannot start.
	fireEvent.click(submitButton());
	expect(submitButton().disabled).toBe(true);
	fireEvent.submit(screen.getByLabelText("Setup code"));
	expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("REQ-011 AC-39: shows the address, token, pairing link and QR after a successful claim", async () => {
	const fetchMock = vi.fn(async () => respond(201, claimed));
	vi.stubGlobal("fetch", fetchMock);
	const url = window.location.href;

	render(<Setup />);
	enterCode("setup-code");
	fireEvent.click(submitButton());

	await screen.findByRole("heading", {
		level: 1,
		name: "Connect your devices",
	});
	expect(fetchMock).toHaveBeenCalledWith("/setup/claim", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ code: "setup-code" }),
	});
	for (const [label, value] of [
		["Server address", claimed.serverUrl],
		["Access token", claimed.accessToken],
		["Pairing link", claimed.pairingLink],
	] as const) {
		const field = screen.getByLabelText<HTMLTextAreaElement>(label);
		expect(field.value).toBe(value);
		expect(field.readOnly).toBe(true);
	}
	const qr = screen.getByRole("img", { name: "QR code for the pairing link" });
	expect(qr.getAttribute("src")).toBe(claimed.qrDataUrl);
	expect(
		screen.getByText(/token is shown only once.*works once, for one hour/),
	).toBeDefined();
	expect(screen.queryByLabelText("Setup code")).toBeNull();
	expect(window.location.href).toBe(url);
});

test("REQ-011 AC-39: shows the wrong-code error on 401 and the already-set-up message on 409, without a token", async () => {
	const fetchMock = vi
		.fn<() => Promise<Response>>()
		.mockResolvedValueOnce(respond(401, { error: "unauthorized" }))
		.mockResolvedValueOnce(respond(409, { error: "setup_closed" }))
		.mockResolvedValueOnce(respond(400, {}))
		.mockRejectedValueOnce(new TypeError("offline"));
	vi.stubGlobal("fetch", fetchMock);

	render(<Setup />);
	enterCode("wrong-code");

	for (const message of [
		"That code is not right. Check the latest code in the server log.",
		"This server is already set up. Use the token you saved, or issue a new one with the CLI.",
		"Setup failed. Try again.",
		"Setup failed. Try again.",
	]) {
		fireEvent.click(submitButton());
		// The old message goes while the next claim is pending.
		expect(screen.getByRole("alert").textContent).toBe("");
		await vi.waitFor(() => {
			expect(screen.getByRole("alert").textContent).toBe(message);
		});
		expect(submitButton().disabled).toBe(false);
		expect(
			screen.getByRole("heading", { level: 1, name: "Set up WAW Tasks" }),
		).toBeDefined();
		expect(screen.queryByLabelText("Access token")).toBeNull();
		expect(screen.queryByRole("img")).toBeNull();
	}
});

test("REQ-011 AC-39: shows the HTTPS message on 403, without a token", async () => {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => respond(403, { error: "https_required" })),
	);

	render(<Setup />);
	enterCode("setup-code");
	fireEvent.click(submitButton());

	await vi.waitFor(() => {
		expect(screen.getByRole("alert").textContent).toBe(
			"Open this page over HTTPS, or on the server itself at http://127.0.0.1:3000/setup.",
		);
	});
	expect(screen.queryByLabelText("Access token")).toBeNull();
	expect(screen.queryByRole("img")).toBeNull();
});

test("REQ-011 AC-39: sends the code without surrounding spaces", () => {
	const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
	vi.stubGlobal("fetch", fetchMock);

	render(<Setup />);
	// Spaces alone are no code.
	enterCode("   ");
	expect(submitButton().disabled).toBe(true);

	enterCode("  setup-code  ");
	fireEvent.click(submitButton());

	expect(fetchMock).toHaveBeenCalledWith("/setup/claim", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: '{"code":"setup-code"}',
	});
});
