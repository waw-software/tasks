import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Sidebar, type SidebarProps } from "./Sidebar.tsx";

afterEach(() => {
	cleanup();
});

const link = (id: string, label: string, count?: number) => ({
	id,
	label,
	href: `#${id}`,
	...(count === undefined ? {} : { count }),
});

const props: SidebarProps = {
	views: [
		link("inbox", "Inbox", 3),
		link("today", "Today", 0),
		link("upcoming", "Upcoming"),
	],
	projects: [{ ...link("home", "Home", 5), color: "red" }],
	labels: [{ ...link("waiting", "@waiting"), color: "amber" }],
	filters: [link("p1", "Priority 1", 1), link("week", "This week at work", 5)],
	serverStatus: { label: "home-server · synced", tone: "synced" },
	onAdd: () => {},
};

function named(name: string): HTMLElement {
	return screen.getByRole("link", { name });
}

test("REQ-004 AC-20: sidebar shows counted Inbox, projects, labels, filters and the server status", () => {
	render(<Sidebar {...props} />);

	expect(screen.getByRole("navigation", { name: "Sidebar" })).toBeTruthy();
	expect(named("Inbox, 3 tasks").getAttribute("href")).toBe("#inbox");
	expect(
		named("Home, 5 tasks")
			.querySelector("[data-color]")
			?.getAttribute("data-color"),
	).toBe("red");
	expect(screen.getByText("@waiting").style.color).toBe("rgb(122, 79, 0)");
	expect(named("@waiting").getAttribute("href")).toBe("#waiting");
	expect(named("Priority 1, 1 task").textContent).toBe("Priority 11");
	expect(named("This week at work, 5 tasks")).toBeTruthy();
	expect(screen.getByText("home-server · synced")).toBeTruthy();
});

test("REQ-004: zero differs from a missing count and the current link follows selection", () => {
	const onNavigate = vi.fn();
	const control = (activeId: string) => (
		<Sidebar {...props} activeId={activeId} onNavigate={onNavigate} />
	);
	const { rerender } = render(control("today"));

	expect(named("Today, 0 tasks").textContent).toBe("Today0");
	expect(named("Upcoming").textContent).toBe("Upcoming");
	expect(named("Today, 0 tasks").getAttribute("aria-current")).toBe("page");
	expect(named("Home, 5 tasks").getAttribute("aria-current")).toBeNull();

	// fireEvent returns false when the default was prevented.
	expect(fireEvent.click(named("Home, 5 tasks"))).toBe(false);
	expect(onNavigate.mock.calls).toEqual([["home"]]);

	onNavigate.mockClear();
	for (const modified of [
		{ ctrlKey: true },
		{ metaKey: true },
		{ shiftKey: true },
		{ altKey: true },
		{ button: 1 },
	]) {
		expect(fireEvent.click(named("Home, 5 tasks"), modified)).toBe(true);
	}
	expect(onNavigate).not.toHaveBeenCalled();

	rerender(control("home"));
	expect(named("Home, 5 tasks").getAttribute("aria-current")).toBe("page");
	expect(named("Home, 5 tasks").style.fontWeight).toBe("600");
	expect(named("Today, 0 tasks").getAttribute("aria-current")).toBeNull();
	expect(named("Today, 0 tasks").style.fontWeight).toBe("500");
});

test("without onNavigate a plain click keeps the link's default", () => {
	render(<Sidebar {...props} />);
	expect(fireEvent.click(named("Home, 5 tasks"))).toBe(true);
});

test("empty groups still render their headings", () => {
	render(
		<Sidebar {...props} views={[]} projects={[]} labels={[]} filters={[]} />,
	);
	expect(
		screen.getAllByRole("heading").map((heading) => heading.textContent),
	).toEqual(["Views", "Projects", "Labels", "Filters"]);
	expect(screen.queryAllByRole("link")).toEqual([]);
});

test("Add task calls onAdd", () => {
	const onAdd = vi.fn();
	render(<Sidebar {...props} onAdd={onAdd} />);
	fireEvent.click(screen.getByRole("button", { name: "Add task" }));
	expect(onAdd).toHaveBeenCalledTimes(1);
});

test("New project is offered only with a handler, and calls it", () => {
	const onNewProject = vi.fn();
	const { rerender } = render(<Sidebar {...props} />);
	expect(screen.queryByRole("button", { name: "New project" })).toBeNull();

	rerender(<Sidebar {...props} onNewProject={onNewProject} />);
	fireEvent.click(screen.getByRole("button", { name: "New project" }));
	expect(onNewProject).toHaveBeenCalledTimes(1);
});

test.each([
	["synced", "rgb(31, 122, 77)"],
	["offline", "rgb(138, 90, 0)"],
	["neutral", "rgb(92, 92, 92)"],
] as const)("the %s server status has its dot colour", (tone, colour) => {
	render(<Sidebar {...props} serverStatus={{ label: "Server", tone }} />);
	const dot = screen.getByText("Server").previousElementSibling as HTMLElement;
	expect(dot.getAttribute("aria-hidden")).toBe("true");
	expect(dot.style.backgroundColor).toBe(colour);
});

test("the server status is a link only with an href", () => {
	const onNavigate = vi.fn();
	const status = { label: "home-server · synced", tone: "synced" } as const;
	const { rerender } = render(
		<Sidebar {...props} serverStatus={status} onNavigate={onNavigate} />,
	);
	expect(
		screen.queryByRole("link", { name: "home-server · synced" }),
	).toBeNull();

	rerender(
		<Sidebar
			{...props}
			serverStatus={{ ...status, href: "#settings" }}
			onNavigate={onNavigate}
		/>,
	);
	const settings = named("home-server · synced");
	expect(settings.getAttribute("href")).toBe("#settings");
	expect(fireEvent.click(settings)).toBe(true);
	expect(onNavigate).not.toHaveBeenCalled();
});

test("the panel is 248 px wide and rows are 44 px targets", () => {
	render(<Sidebar {...props} />);
	const aside = screen.getByRole("complementary");
	expect(aside.style.width).toBe("248px");
	expect(aside.style.boxSizing).toBe("border-box");
	for (const row of screen.getAllByRole("link")) {
		expect(row.style.minHeight).toBe("44px");
	}
	expect(named("@waiting").style.minWidth).toBe("44px");
});
