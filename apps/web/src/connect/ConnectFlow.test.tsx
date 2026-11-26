import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import type {
	ConnectInput,
	ConnectionView,
	ConnectResult,
	WebConnectAdapter,
} from "@waw/api-contract/connect";
import { afterEach, expect, test } from "vitest";
import { ConnectFlow } from "./ConnectFlow.tsx";

afterEach(cleanup);

const origin = "https://tasks.example.com";
const token = `waw_dev_${"c".repeat(43)}`;

function connection(
	capabilities: string[] = ["connect"],
	limitedAccepted = false,
): ConnectionView {
	return {
		serverUrl: origin,
		health: { apiVersion: 1, capabilities },
		persisted: true,
		limitedAccepted,
	};
}

function ok<T>(value: T): ConnectResult<T> {
	return { ok: true, value };
}

type Method = keyof WebConnectAdapter;

/**
 * Each method answers with its next scripted result; an unscripted call fails
 * the test. `calls` records what the flow asked of the session, in order.
 */
function fakeAdapter(
	script: {
		[M in Method]?: (
			| Awaited<ReturnType<WebConnectAdapter[M]>>
			| ReturnType<WebConnectAdapter[M]>
		)[];
	},
) {
	const calls: Method[] = [];
	const inputs: ConnectInput[] = [];
	function next<T>(method: Method): Promise<T> {
		calls.push(method);
		const queue = script[method] as unknown[] | undefined;
		const result = queue?.shift();
		if (result === undefined) throw new Error(`unscripted ${method}`);
		return Promise.resolve(result as T);
	}
	const adapter: WebConnectAdapter = {
		load: () => next("load"),
		submit: (input) => {
			inputs.push(input);
			return next("submit");
		},
		recheck: () => next("recheck"),
		acknowledgeLimited: () => next("acknowledgeLimited"),
		signOut: () => next("signOut"),
	};
	return { adapter, calls, inputs };
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}

async function open(adapter: WebConnectAdapter) {
	await act(async () => {
		render(<ConnectFlow origin={origin} adapter={adapter} />);
	});
}

async function press(name: string) {
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name }));
	});
}

function tokenField() {
	return screen.getByLabelText<HTMLInputElement>("Access token");
}

function enterToken(value: string) {
	fireEvent.change(tokenField(), { target: { value } });
}

function heading() {
	return screen.getByRole("heading", { level: 1 }).textContent;
}

function button(name: string) {
	return screen.queryByRole<HTMLButtonElement>("button", { name });
}

const limitedMessage = "Newer features stay off until the server is updated.";

test("REQ-007 AC-28 restores the session or shows the token-only Connect form", async () => {
	const loading = deferred<ConnectResult<ConnectionView | null>>();
	await open(fakeAdapter({ load: [loading.promise] }).adapter);
	expect(screen.getByText("Connecting…")).toBeDefined();
	expect(screen.queryByRole("heading")).toBeNull();
	expect(screen.queryByRole("button")).toBeNull();

	await act(async () => loading.resolve(ok(connection())));
	expect(heading()).toBe("WAW Tasks");
	expect(button("Sign out")).not.toBeNull();
	expect(screen.queryByText(limitedMessage)).toBeNull();
	cleanup();

	await open(fakeAdapter({ load: [ok(null)] }).adapter);
	expect(heading()).toBe("Connect to your server");
	expect(screen.getByText(origin)).toBeDefined();
	expect(document.querySelectorAll("input, textarea")).toHaveLength(1);
	expect(tokenField().value).toBe("");
});

test("REQ-007 AC-28 signs in and reaches the shell; a refused token stays on Connect with its message", async () => {
	const refused = deferred<ConnectResult<ConnectionView>>();
	const { adapter, calls, inputs } = fakeAdapter({
		load: [ok(null)],
		submit: [refused.promise, ok(connection())],
	});
	await open(adapter);
	enterToken(token);

	await press("Connect");
	expect(button("Connect")?.disabled).toBe(true);
	const { form } = tokenField();
	if (!form) throw new Error("the token field is in no form");
	await act(async () => {
		fireEvent.submit(form);
	});
	expect(calls).toEqual(["load", "submit"]);

	await act(async () => refused.resolve({ ok: false, error: "unauthorized" }));
	expect(heading()).toBe("Connect to your server");
	expect(
		screen.getByText(
			"This token is not valid on this server. It may have been revoked.",
		),
	).toBeDefined();
	expect(button("Connect")?.disabled).toBe(false);

	await press("Connect");
	expect(heading()).toBe("WAW Tasks");
	expect(inputs).toEqual([
		{ kind: "manual", serverUrl: origin, token },
		{ kind: "manual", serverUrl: origin, token },
	]);
});

test("REQ-010 AC-35 shows the update screen, then Check again or Continue with limited features", async () => {
	const continued = fakeAdapter({
		load: [ok(null)],
		submit: [ok(connection([]))],
		acknowledgeLimited: [ok(connection([], true))],
	});
	await open(continued.adapter);
	enterToken(token);
	await press("Connect");
	expect(heading()).toBe("Your server needs an update");

	await press("Continue with limited features");
	expect(heading()).toBe("WAW Tasks");
	expect(screen.getByText(limitedMessage)).toBeDefined();
	expect(button("Check again")).not.toBeNull();
	expect(continued.calls).toEqual(["load", "submit", "acknowledgeLimited"]);
	cleanup();

	const updated = fakeAdapter({
		load: [ok(connection([]))],
		recheck: [
			{ ok: false, error: "unreachable" },
			ok(connection([])),
			ok(connection()),
		],
	});
	await open(updated.adapter);
	await press("Check again");
	expect(heading()).toBe("Your server needs an update");
	await press("Check again");
	expect(heading()).toBe("Your server needs an update");
	await press("Check again");
	expect(heading()).toBe("WAW Tasks");
	expect(screen.queryByText(limitedMessage)).toBeNull();
	expect(button("Check again")).toBeNull();
});

test("REQ-010 AC-35 Continue enters the limited shell when the choice cannot be saved, and a late check changes nothing", async () => {
	const check = deferred<ConnectResult<ConnectionView>>();
	const { adapter, calls } = fakeAdapter({
		load: [ok(connection([]))],
		recheck: [check.promise],
		acknowledgeLimited: [{ ok: false, error: "storage" }],
	});
	await open(adapter);
	await press("Check again");
	expect(button("Check again")?.disabled).toBe(true);

	await press("Continue with limited features");
	expect(heading()).toBe("WAW Tasks");

	await act(async () => check.resolve({ ok: false, error: "unauthorized" }));
	expect(heading()).toBe("WAW Tasks");
	expect(screen.getByText(limitedMessage)).toBeDefined();
	expect(calls).toEqual(["load", "recheck", "acknowledgeLimited"]);
});

test("REQ-010 AC-35 a remembered limited choice opens the shell directly", async () => {
	const { adapter } = fakeAdapter({
		load: [ok(connection([], true))],
		recheck: [ok(connection([], true)), ok(connection())],
	});
	await open(adapter);
	expect(heading()).toBe("WAW Tasks");
	expect(screen.getByText(limitedMessage)).toBeDefined();

	await press("Check again");
	expect(screen.getByText(limitedMessage)).toBeDefined();
	await press("Check again");
	expect(heading()).toBe("WAW Tasks");
	expect(screen.queryByText(limitedMessage)).toBeNull();
});

test.each([
	["the update screen", connection([])],
	["the limited shell", connection([], true)],
])(
	"REQ-007 AC-28 a revoked session found by Check again on %s returns to Connect",
	async (_, view) => {
		const { adapter } = fakeAdapter({
			load: [ok(view)],
			recheck: [{ ok: false, error: "unauthorized" }],
		});
		await open(adapter);

		await press("Check again");

		expect(heading()).toBe("Connect to your server");
	},
);

test("REQ-007 AC-28 sign-out returns to Connect; a failed sign-out stays in the shell", async () => {
	const first = deferred<ConnectResult<null>>();
	const { adapter, calls } = fakeAdapter({
		load: [ok(null)],
		submit: [ok(connection())],
		signOut: [first.promise, ok(null)],
	});
	await open(adapter);
	enterToken(token);
	await press("Connect");

	await press("Sign out");
	expect(button("Sign out")?.disabled).toBe(true);
	await act(async () => first.resolve({ ok: false, error: "unreachable" }));
	expect(heading()).toBe("WAW Tasks");
	expect(screen.getByRole("alert").textContent).toBe(
		"Sign-out failed. Try again.",
	);
	expect(button("Sign out")?.disabled).toBe(false);

	await press("Sign out");
	expect(heading()).toBe("Connect to your server");
	expect(tokenField().value).toBe("");
	expect(calls).toEqual(["load", "submit", "signOut", "signOut"]);
});

test("REQ-007 AC-28 a check that answers after Sign out does not bring the shell back", async () => {
	const check = deferred<ConnectResult<ConnectionView>>();
	const { adapter } = fakeAdapter({
		load: [ok(connection([], true))],
		recheck: [check.promise],
		signOut: [ok(null)],
	});
	await open(adapter);
	await press("Check again");
	await press("Sign out");

	await act(async () => check.resolve(ok(connection())));

	expect(heading()).toBe("Connect to your server");
});

test.each([
	["unreachable", "Can't reach the server"],
	["https-required", "Open this page over HTTPS to sign in."],
	["csrf-forbidden", "Sign-in was refused. Reload the page and try again."],
	["invalid-response", "Something went wrong. Try again."],
] as const)(
	"a failed load offers Try again and does not sign out (%s)",
	async (error, title) => {
		const { adapter, calls } = fakeAdapter({
			load: [{ ok: false, error }, ok(connection())],
		});
		await open(adapter);
		expect(screen.getByRole("status").textContent).toBe(title);
		expect(screen.queryByLabelText("Access token")).toBeNull();

		await press("Try again");

		expect(heading()).toBe("WAW Tasks");
		expect(calls).toEqual(["load", "load"]);
	},
);

test("the token never appears in the rendered output after sign-in", async () => {
	const { adapter } = fakeAdapter({
		load: [ok(null)],
		submit: [ok(connection())],
	});
	await open(adapter);
	enterToken(token);

	await press("Connect");

	expect(heading()).toBe("WAW Tasks");
	expect(document.body.innerHTML).not.toContain(token);
});
