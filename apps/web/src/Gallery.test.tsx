import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import Gallery from "./Gallery.tsx";

afterEach(() => {
	vi.unstubAllGlobals();
	cleanup();
});

test("gallery names each project hue next to a decorative marker", () => {
	const { container } = render(<Gallery />);

	for (const name of [
		"Home",
		"Work",
		"Personal",
		"Errands",
		"Reading",
		"Archive",
	]) {
		expect(screen.getByText(name)).toBeDefined();
	}
	const markers = Array.from(
		container.querySelectorAll<HTMLElement>("[data-color]"),
	);
	expect(markers.map((marker) => marker.dataset.color)).toEqual([
		"red",
		"blue",
		"green",
		"amber",
		"violet",
		"black",
	]);
	for (const marker of markers) {
		expect(marker.getAttribute("aria-hidden")).toBe("true");
	}
	expect(markers[0]?.style.width).toBe("8px");
	expect(markers[0]?.style.borderRadius).toBe("3px");
});

test("gallery shows the four label chips on bg and on surface", () => {
	render(<Gallery />);

	for (const name of ["@money", "@calls", "@waiting", "@errands"]) {
		expect(screen.getAllByText(name)).toHaveLength(2);
	}
	const [onBg, onSurface] = screen.getAllByText("@waiting");
	expect(onBg?.style.color).toBe("rgb(138, 90, 0)");
	expect(onSurface?.style.color).toBe("rgb(122, 79, 0)");
});

test("group headers show the count when given, 0 included", () => {
	render(<Gallery />);

	expect(
		screen.getByRole("heading", { name: /Overdue/ }).textContent,
	).toContain("1");
	const today = screen
		.getAllByRole("heading", { name: /Today/ })
		.map((heading) => heading.textContent);
	expect(today).toHaveLength(2);
	expect(today[0]).toContain("3");
	expect(today[1]).toContain("0");
	expect(
		screen.getByRole("heading", { name: /Someday/ }).textContent,
	).not.toMatch(/\d/);
});

test("progress bars expose done of total and hide a zero total", () => {
	render(<Gallery />);

	const bars = screen.getAllByRole("progressbar");
	expect(bars.map((bar) => bar.getAttribute("aria-valuenow"))).toEqual([
		"0",
		"2",
		"7",
	]);
	expect(bars.map((bar) => bar.getAttribute("aria-valuemax"))).toEqual([
		"7",
		"7",
		"7",
	]);
	expect(screen.getByText("2 of 7 done")).toBeDefined();
	expect(screen.queryByText("0 of 0 done")).toBeNull();
});

function checkbox(name: string) {
	return screen.getByRole<HTMLInputElement>("checkbox", { name });
}

test("the rows page shows controlled checkbox examples", () => {
	render(<Gallery section="rows" />);

	expect(checkbox("Unchecked example").checked).toBe(false);
	expect(checkbox("Checked example").checked).toBe(true);

	fireEvent.click(checkbox("Unchecked example"));

	expect(checkbox("Unchecked example").checked).toBe(true);
});

test("the rows page shows the task row fixtures", () => {
	render(<Gallery section="rows" />);

	for (const title of [
		"Pay rent",
		"Review the pull request",
		"Buy milk",
		"Pick up the dry cleaning",
		"Call the landlord about the broken heating in the bathroom before the weekend",
	]) {
		expect(screen.getByText(title)).toBeDefined();
	}
	expect(screen.queryByText("P4")).toBeNull();
	expect(screen.getByText(/1 of 3 subtasks/)).toBeDefined();
	expect(screen.getByText("not synced yet")).toBeDefined();
	expect(
		screen
			.getByText("Review the pull request")
			.closest('[data-part="row"]')
			?.getAttribute("aria-current"),
	).toBe("true");
	expect(checkbox("Buy milk").checked).toBe(true);
	expect(checkbox("Pay rent").checked).toBe(false);

	fireEvent.click(checkbox("Pay rent"));

	expect(checkbox("Pay rent").checked).toBe(true);
});

function statusWith(text: string) {
	const status = screen
		.getAllByRole("status")
		.find((element) => element.textContent?.includes(text));
	if (!status) throw new Error(`no status contains "${text}"`);
	return status;
}

function press(name: string) {
	fireEvent.click(screen.getByRole("button", { name }));
}

function descriptionOf(field: HTMLElement) {
	const id = field.getAttribute("aria-describedby") ?? "";
	return document.getElementById(id)?.textContent;
}

test("AC-30 Controls shows the waiting count and Retry", () => {
	render(<Gallery section="controls" />);

	expect(statusWith("Working offline").textContent).toContain(
		"3 changes are saved on this computer and will sync when the server is reachable.",
	);
	expect(screen.getByText("Selected: none")).toBeDefined();

	press("Retry");

	expect(screen.getByText("Selected: Retry")).toBeDefined();
});

test("AC-35 Controls shows the update presentation", () => {
	render(<Gallery section="controls" />);

	expect(statusWith("Your server needs an update").textContent).toContain(
		"It runs API v1, this app supports v2. Newer features stay off until you update.",
	);

	press("How to update");

	expect(screen.getByText("Selected: How to update")).toBeDefined();
});

test("AC-28 Controls shows the Connect fields and the reachable result", () => {
	render(<Gallery section="controls" />);

	const address = screen.getByLabelText<HTMLInputElement>("Server address");
	expect(address.type).toBe("url");
	expect(address.value).toBe("https://tasks.example.com");
	expect(descriptionOf(address)).toBe("Enter its address to continue.");
	fireEvent.change(address, {
		target: { value: "https://other.example.com" },
	});
	expect(address.value).toBe("https://other.example.com");

	const token = screen.getByLabelText<HTMLInputElement>("Access token");
	expect(token.type).toBe("password");
	expect(token.value).toBe("example-only");
	expect(token.getAttribute("aria-invalid")).toBe("true");
	expect(descriptionOf(token)).toBe("Enter a valid access token.");

	fireEvent.change(token, { target: { value: "example-only-2" } });

	expect(token.value).toBe("example-only-2");
	expect(token.getAttribute("aria-invalid")).toBeNull();
	expect(screen.queryByText("Enter a valid access token.")).toBeNull();

	fireEvent.change(token, { target: { value: "example-only" } });

	expect(token.getAttribute("aria-invalid")).toBeNull();

	const banner = statusWith("Server reachable · API v1").closest("[data-tone]");
	expect(banner?.getAttribute("data-tone")).toBe("success");
	expect(banner?.querySelector("button")).toBeNull();
});

test("Controls buttons report their selection and the disabled one does not", () => {
	render(<Gallery section="controls" />);

	press("Connect");
	expect(screen.getByText("Selected: Connect")).toBeDefined();

	const again = screen.getByRole<HTMLButtonElement>("button", {
		name: "Check again",
	});
	expect(again.disabled).toBe(true);
	fireEvent.click(again);
	expect(screen.getByText("Selected: Connect")).toBeDefined();

	press("Continue with limited features");
	expect(
		screen.getByText("Selected: Continue with limited features"),
	).toBeDefined();

	press("How to deploy with Docker");
	expect(screen.getByText("Selected: How to deploy with Docker")).toBeDefined();
});

function checkedNames(role: "radio" | "checkbox") {
	return screen
		.getAllByRole<HTMLInputElement>(role)
		.filter((input) => input.checked)
		.map(
			(input) =>
				input.getAttribute("aria-label") ?? input.closest("label")?.textContent,
		);
}

function group(name: string) {
	return screen.getByRole("group", { name });
}

test("Pickers starts with P1, @money, Red, Green, monthly and two reminders", () => {
	render(<Gallery section="pickers" />);

	expect(checkedNames("radio")).toEqual([
		"P1",
		"Red",
		"Green",
		"Every month on the 1st",
	]);
	expect(checkedNames("checkbox")).toEqual([
		"@money6 tasks",
		"At the time of the task",
		"1 day before",
	]);
	expect(group("Color").querySelector("legend")?.textContent).toBe(
		"Color · Red",
	);
	expect(group("Label color").querySelector("legend")?.textContent).toBe(
		"Label color · Green",
	);
});

test("Pickers updates the previews", () => {
	render(<Gallery section="pickers" />);
	const preview = () =>
		screen
			.getByRole("region", { name: "Project colour" })
			.querySelector<HTMLElement>("[data-color]")?.dataset.color;
	expect(preview()).toBe("red");

	fireEvent.click(screen.getByRole("radio", { name: "P2" }));
	fireEvent.click(within(group("Color")).getByRole("radio", { name: "Blue" }));
	fireEvent.click(checkbox("@calls 3 tasks"));

	expect(
		screen.getByRole<HTMLInputElement>("radio", { name: "P2" }).checked,
	).toBe(true);
	expect(preview()).toBe("blue");
	expect(checkbox("@money 6 tasks").checked).toBe(true);
	expect(checkbox("@calls 3 tasks").checked).toBe(true);

	expect(screen.queryByText("Selected: New label")).toBeNull();
	press("New label");
	expect(screen.getByText("Selected: New label")).toBeDefined();
});

test("REQ-003 AC-14: a specific-time reminder is added once and kept with the others", () => {
	render(<Gallery section="pickers" />);
	expect(screen.queryByRole("checkbox", { name: "At 10:00" })).toBeNull();

	press("At a specific time");
	press("At a specific time");

	expect(screen.getAllByRole("checkbox", { name: "At 10:00" })).toHaveLength(1);
	expect(checkbox("At 10:00").checked).toBe(true);
	expect(checkbox("At the time of the task").checked).toBe(true);
	expect(checkbox("1 day before").checked).toBe(true);
});

// Answers the "(width < Npx)" queries as a viewport of the given width would.
function stubViewport(width: number) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: width < Number(/\d+/.exec(query)?.[0]),
		addEventListener: () => {},
		removeEventListener: () => {},
	}));
}

function heading(level: 1 | 2, name: string) {
	return screen.getByRole("heading", { level, name });
}

test("REQ-004: narrow navigation shows the tab bar and Add only on Today", () => {
	stubViewport(390);
	render(<Gallery section="navigation" />);

	expect(heading(1, "Navigation")).toBeDefined();
	expect(screen.getByRole("link", { name: "Back" }).getAttribute("href")).toBe(
		"#/gallery",
	);
	expect(screen.queryByRole("complementary")).toBeNull();
	expect(screen.getByRole("navigation", { name: "Main" })).toBeDefined();
	expect(heading(2, "Today")).toBeDefined();
	for (const line of [
		"Sun 22 Nov · 5 tasks left",
		"2 of 7 done",
		"Send the invoice to the client",
		"Pay rent",
		"Review the pull request",
	]) {
		expect(screen.getByText(line)).toBeDefined();
	}
	expect(screen.queryByText("Selected: Add task")).toBeNull();
	press("Add task");
	expect(screen.getByText("Selected: Add task")).toBeDefined();

	press("Browse");

	expect(heading(2, "Browse")).toBeDefined();
	expect(screen.getByText("Inbox")).toBeDefined();
	expect(screen.getByText("home-server · synced")).toBeDefined();
	expect(screen.queryByText("Pay rent")).toBeNull();
	expect(screen.queryByRole("button", { name: "Add task" })).toBeNull();

	for (const name of ["Upcoming", "Search"]) {
		press(name);
		expect(heading(2, name)).toBeDefined();
		expect(screen.queryByRole("button", { name: "Add task" })).toBeNull();
	}

	press("Today");

	expect(heading(2, "Today")).toBeDefined();
	expect(screen.getByRole("button", { name: "Add task" })).toBeDefined();
});

test("REQ-004 AC-20 presentation: wide navigation shows the sidebar", () => {
	stubViewport(1440);
	render(<Gallery section="navigation" />);

	expect(heading(1, "Navigation")).toBeDefined();
	expect(screen.getByRole("link", { name: "Back" }).getAttribute("href")).toBe(
		"#/gallery",
	);
	expect(screen.queryByRole("navigation", { name: "Main" })).toBeNull();
	const sidebar = within(screen.getByRole("complementary"));
	for (const name of [
		"Inbox, 3 tasks",
		"Today, 5 tasks",
		"Upcoming",
		"Home, 5 tasks",
		"Work, 9 tasks",
		"Personal, 4 tasks",
		"@money",
		"@calls",
		"@waiting",
		"@errands",
		"Priority 1, 3 tasks",
		"This week at work, 5 tasks",
	]) {
		expect(sidebar.getByRole("link", { name }).getAttribute("href")).toBe(
			"#/gallery/navigation",
		);
	}
	expect(sidebar.getByText("home-server · synced")).toBeDefined();
	expect(
		sidebar
			.getByRole("link", { name: "Today, 5 tasks" })
			.getAttribute("aria-current"),
	).toBe("page");
	expect(heading(2, "Today")).toBeDefined();

	fireEvent.click(sidebar.getByRole("link", { name: "Home, 5 tasks" }));

	expect(heading(2, "Home")).toBeDefined();
	expect(
		sidebar
			.getByRole("link", { name: "Home, 5 tasks" })
			.getAttribute("aria-current"),
	).toBe("page");

	press("Add task");
	expect(screen.getByText("Selected: Add task")).toBeDefined();
});
