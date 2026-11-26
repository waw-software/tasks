import {
	APP_API_VERSION,
	CAPABILITY_LABELS,
	type HealthResponse,
	missingCapabilities,
} from "@waw/api-contract/connect";
import { theme } from "@waw/design-tokens";
import { Button } from "../ui/Button.tsx";
import "./connect.css";

export type UpdateServerProps = {
	health: HealthResponse;
	pending: boolean;
	onRetry(): void;
	onContinue(): void;
};

const iconTileSize = 52;
const iconSize = 26;

const columnStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: theme.space.fieldGap,
};

const labelStyle: React.CSSProperties = {
	margin: 0,
	fontSize: theme.type.meta,
	fontWeight: theme.font.medium,
	color: theme.color.muted,
};

/** A command to run on the server; a long line wraps, so that all of it shows. */
export function CodeBlock({ code }: { code: string }): React.JSX.Element {
	return (
		<pre
			style={{
				margin: 0,
				padding: theme.space.optionInline,
				borderRadius: theme.radius.input,
				background: theme.color.ink,
				color: theme.color.bg,
				fontFamily: `ui-monospace, Menlo, ${theme.font.mono}`,
				fontSize: theme.type.meta,
				lineHeight: 1.5,
				whiteSpace: "pre-wrap",
				overflowWrap: "anywhere",
			}}
		>
			<code style={{ fontFamily: "inherit" }}>{code}</code>
		</pre>
	);
}

function VersionCard({ label, version }: { label: string; version: number }) {
	return (
		<div
			style={{
				...columnStyle,
				padding: theme.space.optionInline,
				borderWidth: theme.size.controlBorder,
				borderStyle: "solid",
				borderColor: theme.color.border,
				borderRadius: theme.radius.card,
			}}
		>
			<span style={{ fontSize: theme.type.meta, color: theme.color.muted }}>
				{label}
			</span>
			<span
				style={{
					fontSize: theme.type.sectionMin,
					fontWeight: theme.font.semibold,
				}}
			>
				API v{version}
			</span>
		</div>
	);
}

export function UpdateServer({
	health,
	pending,
	onRetry,
	onContinue,
}: UpdateServerProps): React.JSX.Element {
	const missing = missingCapabilities(health);
	return (
		<main
			className="waw-update"
			style={{
				boxSizing: "border-box",
				display: "flex",
				flexDirection: "column",
				gap: theme.space.dialogPadding,
				maxWidth: 560,
				marginInline: "auto",
				padding: `${theme.space.mainBlock}px ${theme.space.sheetPadding}px`,
				background: theme.color.bg,
				color: theme.color.ink,
				fontFamily: `${theme.font.body}, system-ui, sans-serif`,
			}}
		>
			<div
				aria-hidden="true"
				style={{
					display: "flex",
					flexShrink: 0,
					alignItems: "center",
					justifyContent: "center",
					width: iconTileSize,
					height: iconTileSize,
					borderRadius: theme.radius.overlayMin,
					background: theme.color["accent-tint"],
					color: theme.color["accent-text"],
				}}
			>
				<svg
					aria-hidden="true"
					width={iconSize}
					height={iconSize}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.9"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5" />
				</svg>
			</div>
			<div style={{ ...columnStyle, gap: theme.space.swatchGap }}>
				<h1
					style={{
						margin: 0,
						fontFamily: `"${theme.font.heading}", system-ui, sans-serif`,
						fontSize: theme.type.screen,
						fontWeight: theme.font.semibold,
					}}
				>
					Your server needs an update
				</h1>
				<p
					style={{
						margin: 0,
						fontSize: theme.type.bodyMax,
						lineHeight: 1.5,
						color: theme.color.muted,
					}}
				>
					Your tasks are safe. Newer features stay off until the server is
					updated.
				</p>
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
					gap: theme.space.swatchGap,
				}}
			>
				<VersionCard label="Your server" version={health.apiVersion} />
				<VersionCard label="This app supports" version={APP_API_VERSION} />
			</div>
			{missing.length > 0 ? (
				<div style={columnStyle}>
					<h2 style={labelStyle}>Waiting for the update</h2>
					<ul
						style={{
							margin: 0,
							paddingInlineStart: theme.space.sheetPadding,
							fontSize: theme.type.bodyMin,
							color: theme.color["ink-2"],
						}}
					>
						{missing.map((name) => (
							<li key={name}>{CAPABILITY_LABELS[name]}</li>
						))}
					</ul>
				</div>
			) : null}
			<div style={columnStyle}>
				<span style={labelStyle}>Run this on the server</span>
				<CodeBlock code={"docker compose pull\ndocker compose up -d"} />
			</div>
			<div
				className="waw-update-actions"
				style={{ ...columnStyle, gap: theme.space.optionGap }}
			>
				<Button
					variant="primary"
					fullWidth
					label="Check again"
					disabled={pending}
					onPress={onRetry}
				/>
				<Button
					variant="secondary"
					fullWidth
					label="Continue with limited features"
					onPress={onContinue}
				/>
			</div>
		</main>
	);
}
