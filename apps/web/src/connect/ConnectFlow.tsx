import {
	type ConnectError,
	type ConnectionView,
	type ConnectResult,
	needsServerUpdate,
	type WebConnectAdapter,
} from "@waw/api-contract/connect";
import { theme } from "@waw/design-tokens";
import { useCallback, useEffect, useRef, useState } from "react";
import { Banner } from "../ui/Banner.tsx";
import { ConnectView } from "./ConnectView.tsx";
import { Shell } from "./Shell.tsx";
import { UpdateServer } from "./UpdateServer.tsx";

type Screen =
	| { name: "loading" }
	| { name: "retry"; error: ConnectError }
	| { name: "connect"; error?: ConnectError }
	| { name: "update"; view: ConnectionView }
	| { name: "shell"; limited: boolean; signOutError?: string };

type Action = "load" | "submit" | "recheck" | "continue" | "signOut";

const failed = "Something went wrong. Try again.";

const loadErrors: Partial<Record<ConnectError, string>> = {
	unreachable: "Can't reach the server",
	"https-required": "Open this page over HTTPS to sign in.",
	"csrf-forbidden": "Sign-in was refused. Reload the page and try again.",
};

function screenFor(view: ConnectionView): Screen {
	const limited = needsServerUpdate(view.health);
	return limited && !view.limitedAccepted
		? { name: "update", view }
		: { name: "shell", limited };
}

const pageStyle: React.CSSProperties = {
	maxWidth: 560,
	marginInline: "auto",
	padding: `${theme.space.mainBlock}px ${theme.space.sheetPadding}px`,
	color: theme.color.muted,
	fontFamily: `${theme.font.body}, system-ui, sans-serif`,
};

export function ConnectFlow({
	origin,
	adapter,
}: {
	origin: string;
	adapter: WebConnectAdapter;
}): React.JSX.Element {
	const [screen, setScreen] = useState<Screen>({ name: "loading" });
	const [pending, setPending] = useState<Action | null>(null);
	// The newest action. A ref: a second press can come before the next render.
	const latest = useRef<{ action: Action; done: boolean } | null>(null);

	const running = useCallback(
		() => (latest.current?.done === false ? latest.current.action : null),
		[],
	);

	/** Applies the result only while no newer action has started. */
	const run = useCallback(
		async <T,>(
			action: Action,
			call: () => Promise<T>,
			apply: (result: T) => void,
		) => {
			const mine = { action, done: false };
			latest.current = mine;
			setPending(action);
			const result = await call();
			if (latest.current !== mine) return;
			mine.done = true;
			setPending(null);
			apply(result);
		},
		[],
	);

	const load = useCallback(() => {
		setScreen({ name: "loading" });
		void run(
			"load",
			() => adapter.load(),
			(result) => {
				if (!result.ok) setScreen({ name: "retry", error: result.error });
				else if (result.value === null) setScreen({ name: "connect" });
				else setScreen(screenFor(result.value));
			},
		);
	}, [adapter, run]);

	useEffect(load, [load]);

	function submit(input: Parameters<WebConnectAdapter["submit"]>[0]) {
		if (running() === "submit") return;
		void run(
			"submit",
			() => adapter.submit(input),
			(result) => {
				setScreen(
					result.ok
						? screenFor(result.value)
						: { name: "connect", error: result.error },
				);
			},
		);
	}

	function checked(result: ConnectResult<ConnectionView>) {
		if (result.ok) setScreen(screenFor(result.value));
		else if (result.error === "unauthorized") setScreen({ name: "connect" });
	}

	function checkAgain() {
		if (running() !== null) return;
		void run("recheck", () => adapter.recheck(), checked);
	}

	function continueLimited() {
		if (running() === "continue") return;
		// The saved choice is only a convenience: its failure does not keep the user out.
		void run(
			"continue",
			() => adapter.acknowledgeLimited(),
			() => setScreen({ name: "shell", limited: true }),
		);
	}

	function signOut(limited: boolean) {
		if (running() === "signOut") return;
		setScreen({ name: "shell", limited });
		void run(
			"signOut",
			() => adapter.signOut(),
			(result) => {
				setScreen(
					result.ok
						? { name: "connect" }
						: {
								name: "shell",
								limited,
								signOutError: "Sign-out failed. Try again.",
							},
				);
			},
		);
	}

	switch (screen.name) {
		case "loading":
			return (
				<main style={pageStyle}>
					<p>Connecting…</p>
				</main>
			);
		case "retry":
			return (
				<main style={pageStyle}>
					<Banner
						tone="warning"
						title={loadErrors[screen.error] ?? failed}
						action={{ label: "Try again", onPress: load }}
					/>
				</main>
			);
		case "connect":
			return (
				<ConnectView
					serverUrl={origin}
					pending={pending === "submit"}
					{...(screen.error ? { error: screen.error } : {})}
					onSubmit={submit}
				/>
			);
		case "update":
			return (
				<UpdateServer
					health={screen.view.health}
					pending={pending !== null}
					onRetry={checkAgain}
					onContinue={continueLimited}
				/>
			);
		case "shell":
			return (
				<Shell
					limited={screen.limited}
					onSignOut={() => signOut(screen.limited)}
					signOutPending={pending === "signOut"}
					{...(screen.signOutError
						? { signOutError: screen.signOutError }
						: {})}
					onCheckAgain={checkAgain}
				/>
			);
	}
}
