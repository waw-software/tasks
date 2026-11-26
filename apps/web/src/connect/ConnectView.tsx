import type { ConnectError } from "@waw/api-contract/connect";
import { theme } from "@waw/design-tokens";
import { useState } from "react";
import { Button } from "../ui/Button.tsx";
import { TextInput } from "../ui/TextInput.tsx";
import { CodeBlock } from "./UpdateServer.tsx";
import "./connect.css";

export type ConnectViewProps = {
	serverUrl: string;
	pending: boolean;
	error?: ConnectError;
	onSubmit(input: { kind: "manual"; serverUrl: string; token: string }): void;
};

const failed = "Something went wrong. Try again.";

const connectErrors: Partial<Record<ConnectError, string>> = {
	"invalid-token": "That is not an access token. It starts with waw_dev_.",
	unauthorized:
		"This token is not valid on this server. It may have been revoked.",
	"https-required": "Open this page over HTTPS to sign in.",
	"csrf-forbidden": "Sign-in was refused. Reload the page and try again.",
	unreachable: "The server did not answer. Try again.",
};

const headingFont = `"${theme.font.heading}", system-ui, sans-serif`;

const columnStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	minWidth: 0,
	gap: theme.space.dialogPadding,
};

function Brand() {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: theme.space.swatchGap,
			}}
		>
			<span
				aria-hidden="true"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: theme.size.sidebarWordmarkMark,
					height: theme.size.sidebarWordmarkMark,
					borderRadius: theme.radius.sidebarWordmarkMark,
					background: theme.color.accent,
					color: theme.color.bg,
				}}
			>
				<svg
					aria-hidden="true"
					width={theme.size.sidebarWordmarkIcon}
					height={theme.size.sidebarWordmarkIcon}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.4"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M20 6L9 17l-5-5" />
				</svg>
			</span>
			<span
				style={{
					fontFamily: headingFont,
					fontSize: theme.type.sidebarWordmark,
					fontWeight: theme.font.semibold,
				}}
			>
				WAW Tasks
			</span>
		</div>
	);
}

function LostToken() {
	return (
		<aside
			style={{
				...columnStyle,
				gap: theme.space.overlayGap,
				padding: theme.space.detailPadding,
				borderRadius: theme.radius.overlayMax,
				background: theme.color.surface,
			}}
		>
			<h2
				style={{
					margin: 0,
					fontFamily: headingFont,
					fontSize: theme.type.sectionMin,
					fontWeight: theme.font.semibold,
				}}
			>
				Lost your token?
			</h2>
			<p
				style={{
					margin: 0,
					fontSize: theme.type.bodyMin,
					color: theme.color["ink-2"],
				}}
			>
				Issue a new one on the server:
			</p>
			<CodeBlock code="docker compose exec server node dist/auth/token-cli.js issue" />
		</aside>
	);
}

export function ConnectView({
	serverUrl,
	pending,
	error,
	onSubmit,
}: ConnectViewProps): React.JSX.Element {
	// The token lives in this state only.
	const [token, setToken] = useState("");
	const blocked = pending || token.trim() === "";

	const submit = () => {
		if (blocked) return;
		onSubmit({ kind: "manual", serverUrl, token });
	};

	return (
		<main
			className="waw-connect"
			style={{
				boxSizing: "border-box",
				columnGap: theme.space.mainBlock * 2,
				rowGap: theme.space.mainBlock,
				padding: `${theme.space.mainBlock}px ${theme.space.sheetPadding}px`,
				background: theme.color.bg,
				color: theme.color.ink,
				fontFamily: `${theme.font.body}, system-ui, sans-serif`,
			}}
		>
			<div style={columnStyle}>
				<Brand />
				<div style={{ ...columnStyle, gap: theme.space.swatchGap }}>
					<h1
						style={{
							margin: 0,
							fontFamily: headingFont,
							fontSize: theme.type.screen,
							fontWeight: theme.font.semibold,
						}}
					>
						Connect to your server
					</h1>
					<p
						style={{
							margin: 0,
							fontSize: theme.type.bodyMax,
							lineHeight: 1.5,
							color: theme.color.muted,
						}}
					>
						Enter the access token from this server's setup page to sign in on
						this browser.
					</p>
				</div>
				<dl style={{ ...columnStyle, gap: theme.space.fieldGap, margin: 0 }}>
					<dt
						style={{
							fontSize: theme.type.meta,
							fontWeight: theme.font.medium,
							color: theme.color.muted,
						}}
					>
						Server
					</dt>
					<dd
						style={{
							margin: 0,
							fontFamily: `ui-monospace, Menlo, ${theme.font.mono}`,
							fontSize: theme.type.bodyMin,
							overflowWrap: "anywhere",
						}}
					>
						{serverUrl}
					</dd>
				</dl>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						submit();
					}}
					style={{ ...columnStyle, gap: theme.space.overlayGap }}
				>
					<TextInput
						label="Access token"
						kind="token"
						value={token}
						onValueChange={setToken}
						errorText={error ? (connectErrors[error] ?? failed) : ""}
					/>
					<Button
						variant="primary"
						fullWidth
						label="Connect"
						disabled={blocked}
						onPress={submit}
					/>
				</form>
			</div>
			<LostToken />
		</main>
	);
}
