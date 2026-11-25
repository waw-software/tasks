import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { TaskRow, type TaskRowProps } from "./TaskRow";

const hidden = { includeHiddenElements: true };

const base: TaskRowProps = {
	title: "Pay rent",
	checked: false,
	onCheckedChange: () => {},
	priority: 1,
};

const full: TaskRowProps = {
	...base,
	scheduleText: "09:00 · repeats monthly",
	labels: [
		{ name: "@money", color: "green" },
		{ name: "@waiting", color: "amber" },
	],
	project: { name: "Home", color: "red" },
};

describe("TaskRow", () => {
	it("AC-10 shows P1 to P3 in their ink and hides P4", async () => {
		const view = await render(<TaskRow {...full} />);

		for (const [priority, color] of [
			[1, "#B01A31"],
			[2, "#8A5A00"],
			[3, "#1F5FBF"],
		] as const) {
			await view.rerender(<TaskRow {...full} priority={priority} />);
			expect(screen.getByText(`P${priority}`)).toHaveStyle({
				color,
				fontFamily: "Inter_600SemiBold",
			});
			expect(
				screen.getByText(`P${priority} · 09:00 · repeats monthly`),
			).toBeOnTheScreen();
		}

		await view.rerender(<TaskRow {...full} priority={4} />);

		expect(screen.queryByText(/P4/)).toBeNull();
		expect(screen.getByText(/repeats monthly/)).toHaveTextContent(
			"09:00 · repeats monthly",
			{ exact: true },
		);
	});

	it("AC-08 shows subtask progress in the meta line", async () => {
		const view = await render(
			<TaskRow {...base} priority={4} subtasks={{ done: 1, total: 3 }} />,
		);
		expect(screen.getByText("1 of 3 subtasks")).toBeOnTheScreen();

		await view.rerender(
			<TaskRow
				{...base}
				priority={3}
				scheduleText="17:00"
				subtasks={{ done: 0, total: 3 }}
			/>,
		);
		expect(screen.getByText("P3 · 17:00 · 0 of 3 subtasks")).toBeOnTheScreen();

		await view.rerender(<TaskRow {...base} subtasks={{ done: 0, total: 0 }} />);
		expect(screen.queryByText(/subtasks/)).toBeNull();
		expect(screen.queryByText(/·/)).toBeNull();
	});

	it("AC-29 marks a row that is not synced yet", async () => {
		const view = await render(<TaskRow {...base} pendingSync />);
		expect(screen.getByText("not synced yet")).toHaveStyle({
			color: "#8A5A00",
			fontFamily: "Inter_600SemiBold",
		});

		await view.rerender(<TaskRow {...base} />);

		expect(screen.queryByText("not synced yet")).toBeNull();
	});

	it("keeps the project marker after its name", async () => {
		await render(<TaskRow {...full} />);

		const [name, marker, ...rest] = screen.getByTestId("task-project").children;
		expect(rest).toHaveLength(0);
		expect(name).toBe(screen.getByText("Home"));
		expect(marker).toBe(screen.getByTestId("marker-red", hidden));
		expect(screen.getByText("@money")).toBeOnTheScreen();
		expect(screen.getByText("@waiting")).toBeOnTheScreen();
	});

	it("checked and selected are independent", async () => {
		const view = await render(<TaskRow {...base} checked />);
		const title = () => screen.getByText("Pay rent");
		const row = () =>
			StyleSheet.flatten(screen.getByTestId("task-row").props.style);

		expect(title()).toHaveStyle({
			textDecorationLine: "line-through",
			color: "#5C5C5C",
		});
		expect(title().props.accessibilityState).toEqual({ selected: false });
		expect(row().backgroundColor).not.toBe("#FCEBEE");

		await view.rerender(<TaskRow {...base} selected />);

		expect(title()).toHaveStyle({ color: "#171717" });
		expect(title()).not.toHaveStyle({ textDecorationLine: "line-through" });
		expect(title().props.accessibilityState).toEqual({ selected: true });
		expect(row().backgroundColor).toBe("#FCEBEE");
		expect(
			screen.getByRole("checkbox", { name: "Pay rent" }),
		).not.toBeChecked();
	});

	it("the row checkbox is named by the title and emits the next value", async () => {
		const onCheckedChange = jest.fn();
		await render(<TaskRow {...base} onCheckedChange={onCheckedChange} />);

		await fireEvent.press(screen.getByRole("checkbox", { name: "Pay rent" }));

		expect(onCheckedChange).toHaveBeenCalledWith(true);
	});

	it("a row with no meta parts renders no meta line", async () => {
		const view = await render(<TaskRow {...base} priority={4} />);
		expect(screen.queryByTestId("task-meta")).toBeNull();

		await view.rerender(<TaskRow {...base} priority={4} labels={[]} />);
		expect(screen.queryByTestId("task-meta")).toBeNull();

		await view.rerender(<TaskRow {...base} priority={4} pendingSync />);
		expect(screen.getByTestId("task-meta")).toBeOnTheScreen();
	});
});
