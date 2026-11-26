import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useViewportBelow } from "./useViewportBelow.ts";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

// A viewport the test resizes. It answers only the `(width < Npx)` query.
function fakeViewport(initialWidth: number) {
	let viewport = initialWidth;
	const lists: { limit: number; listeners: Set<() => void> }[] = [];
	vi.stubGlobal("matchMedia", (query: string) => {
		const match = /^\(width < (\d+)px\)$/.exec(query);
		if (!match) throw new Error(`unexpected media query: ${query}`);
		const list = { limit: Number(match[1]), listeners: new Set<() => void>() };
		lists.push(list);
		return {
			media: query,
			get matches() {
				return viewport < list.limit;
			},
			addEventListener(type: string, listener: () => void) {
				if (type === "change") list.listeners.add(listener);
			},
			removeEventListener(type: string, listener: () => void) {
				if (type === "change") list.listeners.delete(listener);
			},
		};
	});
	return {
		// As in a browser, only a query whose answer flips sends a change event.
		resize(next: number) {
			const previous = viewport;
			viewport = next;
			for (const { limit, listeners } of lists) {
				if (previous < limit !== next < limit) {
					for (const listener of [...listeners]) listener();
				}
			}
		},
		listenerCount: () =>
			lists.reduce((count, { listeners }) => count + listeners.size, 0),
	};
}

test.each([
	[699, true],
	[700, false],
])(
	"DESIGN §6: navigation switches at 700 CSS px: width %i is below: %s",
	(width, below) => {
		fakeViewport(width);
		const { result } = renderHook(() => useViewportBelow(700));
		expect(result.current).toBe(below);
	},
);

test("DESIGN §6: navigation switches at 700 CSS px: a change event updates the value", () => {
	const viewport = fakeViewport(700);
	const { result } = renderHook(() => useViewportBelow(700));
	expect(result.current).toBe(false);

	act(() => viewport.resize(699));
	expect(result.current).toBe(true);

	act(() => viewport.resize(700));
	expect(result.current).toBe(false);
});

test("DESIGN §6: navigation switches at 700 CSS px: a new width moves the subscription, unmount removes it", () => {
	const viewport = fakeViewport(800);
	const { result, rerender, unmount } = renderHook(
		(width: number) => useViewportBelow(width),
		{ initialProps: 700 },
	);
	expect(viewport.listenerCount()).toBe(1);

	rerender(1100);
	expect(result.current).toBe(true);
	expect(viewport.listenerCount()).toBe(1);
	act(() => viewport.resize(1100));
	expect(result.current).toBe(false);

	unmount();
	expect(viewport.listenerCount()).toBe(0);
});

test("DESIGN §6: navigation switches at 700 CSS px: without matchMedia the value is false", () => {
	vi.stubGlobal("matchMedia", undefined);
	const { result } = renderHook(() => useViewportBelow(700));
	expect(result.current).toBe(false);
});
