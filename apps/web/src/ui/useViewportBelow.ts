import { useCallback, useSyncExternalStore } from "react";

// True while the viewport is narrower than `width` CSS px, and false where the
// environment has no matchMedia.
export function useViewportBelow(width: number): boolean {
	const query = `(width < ${width}px)`;
	// Stable per query, so a render does not subscribe again.
	const subscribe = useCallback(
		(onChange: () => void) => {
			const list = window.matchMedia?.(query);
			list?.addEventListener("change", onChange);
			return () => list?.removeEventListener("change", onChange);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia?.(query).matches ?? false,
	);
}
