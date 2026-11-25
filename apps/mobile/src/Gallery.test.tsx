import { theme } from "@waw/design-tokens";
import {
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import Gallery from "./Gallery";

describe("Gallery", () => {
	it("gallery names each project hue next to a decorative marker", async () => {
		await render(<Gallery onBack={jest.fn()} />);

		for (const name of [
			"Home",
			"Work",
			"Personal",
			"Errands",
			"Reading",
			"Archive",
		]) {
			expect(screen.getByText(name)).toBeOnTheScreen();
		}
		for (const color of ["red", "blue", "green", "amber", "violet", "black"]) {
			const id = `marker-${color}`;
			expect(
				screen.getByTestId(id, { includeHiddenElements: true }),
			).toBeOnTheScreen();
			expect(screen.queryByTestId(id)).toBeNull();
		}
		const red = screen.getByTestId("marker-red", {
			includeHiddenElements: true,
		});
		expect(StyleSheet.flatten(red.props.style)).toMatchObject({
			width: 8,
			height: 8,
			borderRadius: 3,
			backgroundColor: theme.project.red,
		});
	});

	it("gallery shows the four label chips on bg and on surface", async () => {
		await render(<Gallery onBack={jest.fn()} />);

		for (const name of ["@money", "@calls", "@waiting", "@errands"]) {
			expect(screen.getAllByText(name)).toHaveLength(2);
		}
		const [onBg, onSurface] = screen.getAllByText("@waiting");
		expect(onBg).toHaveStyle({ color: theme.label.amber.ink });
		expect(onSurface).toHaveStyle({ color: theme.label.amber.surfaceInk });
	});

	it("group headers show the count when given, 0 included", async () => {
		await render(<Gallery onBack={jest.fn()} />);

		for (const name of ["OVERDUE 1", "TODAY 3", "TODAY 0", "SOMEDAY"]) {
			expect(screen.getByRole("header", { name })).toBeOnTheScreen();
		}
		expect(screen.getByRole("header", { name: "OVERDUE 1" })).toHaveStyle({
			color: theme.color["accent-text"],
		});
		expect(screen.getByRole("header", { name: "TODAY 3" })).toHaveStyle({
			color: theme.color.muted,
		});
	});

	it("progress bars expose done of total and hide a zero total", async () => {
		await render(<Gallery onBack={jest.fn()} />);

		const bars = screen.getAllByRole("progressbar", { name: "Tasks done" });
		expect(bars).toHaveLength(3);
		expect(bars.map((bar) => bar.props.accessibilityValue)).toEqual([
			{ min: 0, max: 7, now: 0 },
			{ min: 0, max: 7, now: 2 },
			{ min: 0, max: 7, now: 7 },
		]);
		expect(screen.getByText("2 of 7 done")).toBeOnTheScreen();
		expect(screen.queryByText("0 of 0 done")).toBeNull();
	});

	it("Back calls onBack", async () => {
		const onBack = jest.fn();
		await render(<Gallery onBack={onBack} />);

		await fireEvent.press(screen.getByRole("button", { name: "Back" }));

		expect(onBack).toHaveBeenCalledTimes(1);
	});

	it("Task rows calls onOpenRows", async () => {
		const onOpenRows = jest.fn();
		await render(<Gallery onBack={jest.fn()} onOpenRows={onOpenRows} />);

		await fireEvent.press(screen.getByRole("button", { name: "Task rows" }));

		expect(onOpenRows).toHaveBeenCalledTimes(1);
	});

	it("the rows page shows controlled checkbox examples", async () => {
		await render(<Gallery section="rows" onBack={jest.fn()} />);

		expect(
			screen.getByRole("header", { name: "Task row gallery" }),
		).toBeOnTheScreen();
		for (const name of ["Unchecked example", "Checked example"]) {
			expect(screen.getByText(name)).toBeOnTheScreen();
		}
		const unchecked = () =>
			screen.getByRole("checkbox", { name: "Unchecked example" });
		const checked = () =>
			screen.getByRole("checkbox", { name: "Checked example" });
		expect(unchecked().props.accessibilityState).toMatchObject({
			checked: false,
		});
		expect(checked().props.accessibilityState).toMatchObject({
			checked: true,
		});

		await fireEvent.press(unchecked());

		expect(unchecked().props.accessibilityState).toMatchObject({
			checked: true,
		});

		await fireEvent.press(checked());

		expect(checked().props.accessibilityState).toMatchObject({
			checked: false,
		});
	});

	it("the rows page shows the task row fixtures", async () => {
		await render(<Gallery section="rows" onBack={jest.fn()} />);

		for (const title of [
			"Pay rent",
			"Review the pull request",
			"Buy milk",
			"Pick up the dry cleaning",
			"Call the landlord about the broken heating in the bathroom before the weekend",
		]) {
			expect(screen.getByText(title)).toBeOnTheScreen();
		}
		expect(screen.queryByText(/P4/)).toBeNull();
		expect(screen.getByText(/1 of 3 subtasks/)).toBeOnTheScreen();
		expect(screen.getByText("not synced yet")).toBeOnTheScreen();
		expect(
			screen.getByText("Review the pull request").props.accessibilityState,
		).toMatchObject({ selected: true });
		expect(screen.getByRole("checkbox", { name: "Buy milk" })).toBeChecked();
		const payRent = () => screen.getByRole("checkbox", { name: "Pay rent" });
		expect(payRent()).not.toBeChecked();

		await fireEvent.press(payRent());

		expect(payRent()).toBeChecked();
	});

	it("Controls calls onOpenControls", async () => {
		const onOpenControls = jest.fn();
		await render(
			<Gallery onBack={jest.fn()} onOpenControls={onOpenControls} />,
		);

		await fireEvent.press(screen.getByRole("button", { name: "Controls" }));

		expect(onOpenControls).toHaveBeenCalledTimes(1);
	});

	it("AC-30 Controls shows the waiting count and Retry", async () => {
		await render(<Gallery section="controls" onBack={jest.fn()} />);

		const banner = within(screen.getByTestId("banner-warning"));
		expect(
			banner.getByLabelText(
				/Working offline.*3 changes are saved on this phone and will sync when the server is reachable\./,
			),
		).toBeOnTheScreen();
		expect(screen.getByText("Selected: none")).toBeOnTheScreen();

		await fireEvent.press(banner.getByRole("button", { name: "Retry" }));

		expect(screen.getByText("Selected: Retry")).toBeOnTheScreen();
	});

	it("AC-35 Controls shows the update presentation", async () => {
		await render(<Gallery section="controls" onBack={jest.fn()} />);

		const banner = within(screen.getByTestId("banner-update"));
		expect(banner.getByText("Your server needs an update")).toBeOnTheScreen();
		expect(
			banner.getByText(
				"It runs API v1, this app supports v2. Newer features stay off until you update.",
			),
		).toBeOnTheScreen();

		await fireEvent.press(
			banner.getByRole("button", { name: "How to update" }),
		);

		expect(screen.getByText("Selected: How to update")).toBeOnTheScreen();
	});

	it("AC-28 Controls shows the Connect fields and reachable result", async () => {
		await render(<Gallery section="controls" onBack={jest.fn()} />);

		const address = screen.getByTestId("input-Server address");
		expect(address.props.value).toBe("https://tasks.example.com");
		expect(address.props.accessibilityHint).toBe(
			"Enter its address to continue.",
		);
		const token = () => screen.getByTestId("input-Access token");
		expect(token().props.value).toBe("example-only");
		expect(token().props.secureTextEntry).toBe(true);
		expect(token().props.accessibilityHint).toBe("Enter a valid access token.");
		expect(screen.getByText("Enter a valid access token.")).toBeOnTheScreen();

		await fireEvent.changeText(token(), "example-only-2");

		expect(token().props.value).toBe("example-only-2");
		expect(screen.queryByText("Enter a valid access token.")).toBeNull();

		await fireEvent.changeText(address, "https://other.example.com");

		expect(screen.getByTestId("input-Server address").props.value).toBe(
			"https://other.example.com",
		);

		const success = within(screen.getByTestId("banner-success"));
		expect(success.getByText("Server reachable · API v1")).toBeOnTheScreen();
		expect(success.queryByRole("button")).toBeNull();
	});

	it("Controls buttons report the selection and disabled Check again keeps it", async () => {
		await render(<Gallery section="controls" onBack={jest.fn()} />);

		expect(screen.getByRole("header", { name: "Controls" })).toBeOnTheScreen();
		for (const name of [
			"Connect",
			"Continue with limited features",
			"How to deploy with Docker",
		]) {
			await fireEvent.press(screen.getByRole("button", { name }));

			expect(screen.getByText(`Selected: ${name}`)).toBeOnTheScreen();
		}
		const again = screen.getByRole("button", { name: "Check again" });
		expect(again.props.accessibilityState).toMatchObject({ disabled: true });

		await fireEvent.press(again);

		expect(
			screen.getByText("Selected: How to deploy with Docker"),
		).toBeOnTheScreen();
	});

	it("Pickers calls onOpenPickers", async () => {
		const onOpenPickers = jest.fn();
		await render(<Gallery onBack={jest.fn()} onOpenPickers={onOpenPickers} />);

		await fireEvent.press(screen.getByRole("button", { name: "Pickers" }));

		expect(onOpenPickers).toHaveBeenCalledTimes(1);
	});

	it("Pickers starts with P1, @money, Red, Green, monthly and two reminders", async () => {
		await render(<Gallery section="pickers" onBack={jest.fn()} />);

		expect(screen.getByRole("header", { name: "Pickers" })).toBeOnTheScreen();
		const checkedIn = (group: string, role: "radio" | "checkbox") =>
			within(screen.getByLabelText(group))
				.getAllByRole(role)
				.filter((item) => item.props.accessibilityState.checked)
				.map((item) => item.props.accessibilityLabel);
		expect(checkedIn("Priority", "radio")).toEqual(["P1"]);
		expect(checkedIn("Labels", "checkbox")).toEqual(["@money, 6 tasks"]);
		expect(checkedIn("Color", "radio")).toEqual(["Red"]);
		expect(checkedIn("Label color", "radio")).toEqual(["Green"]);
		expect(checkedIn("Repeat", "radio")).toEqual(["Every month on the 1st"]);
		expect(checkedIn("Reminders", "checkbox")).toEqual([
			"At the time of the task",
			"1 day before",
		]);
		expect(screen.getByText("Color · Red")).toBeOnTheScreen();
		expect(screen.getByText("Label color · Green")).toBeOnTheScreen();
		expect(
			screen.getByText("P1 tasks rise to the top of Today. P4 is the default."),
		).toBeOnTheScreen();
		expect(
			screen.getByText(
				"Next one appears after you complete this one: Tue 1 Dec, 09:00.",
			),
		).toBeOnTheScreen();
		expect(screen.getByText("Home")).toBeOnTheScreen();
		expect(screen.getByText("5 tasks")).toBeOnTheScreen();
	});

	it("Pickers updates the previews", async () => {
		await render(<Gallery section="pickers" onBack={jest.fn()} />);
		const marker = (color: string) =>
			screen.queryByTestId(`marker-${color}`, { includeHiddenElements: true });
		expect(marker("red")).not.toBeNull();

		await fireEvent.press(screen.getByRole("radio", { name: "P2" }));

		expect(
			screen.getByRole("radio", { name: "P2" }).props.accessibilityState,
		).toMatchObject({ checked: true });

		await fireEvent.press(
			within(screen.getByLabelText("Color")).getByRole("radio", {
				name: "Blue",
			}),
		);

		expect(marker("blue")).not.toBeNull();
		expect(marker("red")).toBeNull();

		await fireEvent.press(
			screen.getByRole("checkbox", { name: "@calls, 3 tasks" }),
		);

		for (const name of ["@money, 6 tasks", "@calls, 3 tasks"]) {
			expect(
				screen.getByRole("checkbox", { name }).props.accessibilityState,
			).toMatchObject({ checked: true });
		}

		expect(screen.getByText("Selected: none")).toBeOnTheScreen();

		await fireEvent.press(screen.getByRole("button", { name: "New label" }));

		expect(screen.getByText("Selected: New label")).toBeOnTheScreen();
	});

	it("REQ-003 AC-14: a specific-time reminder is added once and kept with the others", async () => {
		await render(<Gallery section="pickers" onBack={jest.fn()} />);
		const add = () =>
			fireEvent.press(
				screen.getByRole("button", { name: "At a specific time" }),
			);

		await add();
		await add();

		expect(screen.getAllByRole("checkbox", { name: "At 10:00" })).toHaveLength(
			1,
		);
		for (const name of [
			"At 10:00",
			"At the time of the task",
			"1 day before",
		]) {
			expect(
				screen.getByRole("checkbox", { name }).props.accessibilityState,
			).toMatchObject({ checked: true });
		}
	});

	it("Navigation calls onOpenNavigation", async () => {
		const onOpenNavigation = jest.fn();
		await render(
			<Gallery onBack={jest.fn()} onOpenNavigation={onOpenNavigation} />,
		);

		await fireEvent.press(screen.getByRole("button", { name: "Navigation" }));

		expect(onOpenNavigation).toHaveBeenCalledTimes(1);
	});

	it("REQ-004: Navigation switches destinations and shows Add only on Today", async () => {
		await render(<Gallery section="navigation" onBack={jest.fn()} />);
		const press = (name: string) =>
			fireEvent.press(screen.getByRole("button", { name }));
		const todayLines = [
			"Sun 22 Nov · 5 tasks left",
			"2 of 7 done",
			"Send the invoice to the client",
			"Pay rent",
			"Review the pull request",
		];

		expect(
			screen.getByRole("header", { name: "Navigation" }),
		).toBeOnTheScreen();
		expect(screen.getByRole("header", { name: "Today" })).toBeOnTheScreen();
		expect(
			screen.getByRole("button", { name: "Today" }).props.accessibilityState,
		).toMatchObject({ selected: true });
		for (const line of todayLines) {
			expect(screen.getByText(line)).toBeOnTheScreen();
		}
		expect(screen.queryByText("Selected: Add task")).toBeNull();

		await press("Add task");

		expect(screen.getByText("Selected: Add task")).toBeOnTheScreen();

		await press("Browse");

		expect(screen.getByRole("header", { name: "Browse" })).toBeOnTheScreen();
		expect(screen.queryByRole("header", { name: "Today" })).toBeNull();
		expect(screen.getByText("Inbox")).toBeOnTheScreen();
		expect(screen.getByText("home-server · synced")).toBeOnTheScreen();
		expect(screen.queryByText("Pay rent")).toBeNull();
		expect(screen.queryByRole("button", { name: "Add task" })).toBeNull();

		for (const name of ["Upcoming", "Search"]) {
			await press(name);

			expect(screen.getByRole("header", { name })).toBeOnTheScreen();
			expect(screen.queryByText("Inbox")).toBeNull();
			expect(screen.queryByRole("button", { name: "Add task" })).toBeNull();
		}

		await press("Today");

		expect(screen.getByRole("header", { name: "Today" })).toBeOnTheScreen();
		expect(screen.getByRole("button", { name: "Add task" })).toBeOnTheScreen();
	});
});
