import type { SetupClaimResponse } from "@waw/api-contract";
import { theme } from "@waw/design-tokens";
import { useId, useState } from "react";
import { Button } from "./ui/Button.tsx";
import { TextInput } from "./ui/TextInput.tsx";
import "./Setup.css";

const failed = "Setup failed. Try again.";

const claimErrors: Partial<Record<number, string>> = {
	401: "That code is not right. Check the latest code in the server log.",
	409: "This server is already set up. Use the token you saved, or issue a new one with the CLI.",
};

const qrSize = 240;

const textStyle: React.CSSProperties = {
	margin: 0,
	fontSize: theme.type.bodyMin,
	color: theme.color["ink-2"],
};

function Page({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<main
			style={{
				boxSizing: "border-box",
				display: "flex",
				flexDirection: "column",
				gap: theme.space.overlayGap,
				maxWidth: 560,
				marginInline: "auto",
				padding: `${theme.space.mainBlock}px ${theme.space.sheetPadding}px`,
				background: theme.color.bg,
				color: theme.color.ink,
				fontFamily: `${theme.font.body}, system-ui, sans-serif`,
			}}
		>
			<h1
				style={{
					margin: 0,
					fontFamily: `"${theme.font.heading}", system-ui, sans-serif`,
					fontSize: theme.type.screen,
					fontWeight: theme.font.semibold,
				}}
			>
				{title}
			</h1>
			{children}
		</main>
	);
}

// A text area wraps a long value, so that all of it stays visible on a phone.
function Value({
	label,
	value,
	rows,
}: {
	label: string;
	value: string;
	rows: number;
}) {
	const id = useId();
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: theme.space.fieldGap,
			}}
		>
			<label
				htmlFor={id}
				style={{
					fontSize: theme.type.meta,
					fontWeight: theme.font.medium,
					color: theme.color.muted,
				}}
			>
				{label}
			</label>
			<textarea
				id={id}
				className="waw-setup-value"
				readOnly
				rows={rows}
				value={value}
				spellCheck={false}
				onFocus={(event) => event.target.select()}
				style={
					{
						"--waw-focus": theme.color["accent-text"],
						"--waw-focus-width": `${theme.size.focusRing}px`,
						"--waw-focus-offset": `${theme.space.focusOffset}px`,
						boxSizing: "border-box",
						width: "100%",
						margin: 0,
						padding: `${theme.space.bannerBlock}px ${theme.space.inputInline}px`,
						borderWidth: theme.size.controlBorder,
						borderStyle: "solid",
						borderColor: theme.color["border-strong"],
						borderRadius: theme.radius.input,
						background: theme.color.surface,
						color: theme.color.ink,
						fontFamily: `ui-monospace, Menlo, ${theme.font.mono}`,
						fontSize: theme.type.bodyMin,
					} as React.CSSProperties
				}
			/>
		</div>
	);
}

function Result({ result }: { result: SetupClaimResponse }) {
	return (
		<Page title="Connect your devices">
			<p style={textStyle}>
				Save these now. The access token is shown only once, and the pairing
				link works once, for one hour.
			</p>
			<Value label="Server address" value={result.serverUrl} rows={1} />
			<Value label="Access token" value={result.accessToken} rows={2} />
			<Value label="Pairing link" value={result.pairingLink} rows={3} />
			<img
				alt="QR code for the pairing link"
				src={result.qrDataUrl}
				width={qrSize}
				height={qrSize}
				style={{ alignSelf: "center", imageRendering: "pixelated" }}
			/>
		</Page>
	);
}

export function Setup({
	initialResult,
}: {
	initialResult?: SetupClaimResponse;
}): React.JSX.Element {
	// The code and the claimed secrets live in this state only.
	const [code, setCode] = useState("");
	const [result, setResult] = useState(initialResult);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState("");

	if (result) return <Result result={result} />;

	const blocked = pending || code === "";

	const claim = async () => {
		if (blocked) return;
		setPending(true);
		setError("");
		try {
			const response = await fetch("/setup/claim", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ code }),
			});
			if (response.status === 201) {
				setResult((await response.json()) as SetupClaimResponse);
			} else {
				setError(claimErrors[response.status] ?? failed);
			}
		} catch {
			// No answer, or one that cannot be read.
			setError(failed);
		}
		setPending(false);
	};

	return (
		<Page title="Set up WAW Tasks">
			<p style={textStyle}>
				Enter the setup code from the server log (
				<code>docker compose logs server</code>).
			</p>
			<form
				onSubmit={(event) => {
					event.preventDefault();
					void claim();
				}}
				style={{
					display: "flex",
					flexDirection: "column",
					gap: theme.space.overlayGap,
				}}
			>
				<TextInput
					label="Setup code"
					kind="token"
					value={code}
					onValueChange={setCode}
					errorText={error}
				/>
				<Button
					variant="primary"
					fullWidth
					label="Show access token"
					disabled={blocked}
					onPress={() => void claim()}
				/>
			</form>
		</Page>
	);
}
