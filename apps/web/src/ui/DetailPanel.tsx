import { theme } from "@waw/design-tokens";
import { useId } from "react";
import "./DetailPanel.css";

export type DetailPanelProps = {
	title: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	onClose: () => void;
};

export function DetailPanel({
	title,
	children,
	footer,
	onClose,
}: DetailPanelProps): React.JSX.Element {
	const titleId = useId();

	return (
		<aside
			aria-labelledby={titleId}
			onKeyDown={(event) => {
				if (event.key === "Escape") onClose();
			}}
			style={{
				boxSizing: "border-box",
				display: "flex",
				flexDirection: "column",
				gap: theme.space.overlayGap,
				width: theme.size.detailPreferred,
				minWidth: theme.size.detailMin,
				maxWidth: theme.size.detailMax,
				height: "100%",
				minHeight: 0,
				padding: `${theme.space.detailPadding}px ${theme.space.detailPadding}px ${theme.space.detailBottom}px`,
				borderLeft: `${theme.size.controlBorder}px solid ${theme.color.divider}`,
				backgroundColor: theme.color.bg,
				color: theme.color.ink,
				fontFamily: `${theme.font.body}, system-ui, sans-serif`,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					gap: theme.space.overlayGap,
				}}
			>
				<h2
					id={titleId}
					style={{
						flex: 1,
						minWidth: 0,
						margin: 0,
						fontFamily: `"${theme.font.heading}", system-ui, sans-serif`,
						fontSize: theme.type.detailTitle,
						fontWeight: theme.font.semibold,
						overflowWrap: "anywhere",
					}}
				>
					{title}
				</h2>
				<button
					type="button"
					className="waw-detail-close"
					aria-label="Close panel"
					onClick={() => onClose()}
					style={
						{
							"--waw-bg": theme.color.bg,
							"--waw-ink": theme.color.ink,
							"--waw-bg-hover": theme.color.surface,
							"--waw-bg-active": theme.color.divider,
							"--waw-focus": theme.color["accent-text"],
							"--waw-focus-width": `${theme.size.focusRing}px`,
							"--waw-focus-offset": `${theme.space.focusOffset}px`,
							display: "flex",
							flex: "none",
							alignItems: "center",
							justifyContent: "center",
							width: theme.size.touchTarget,
							height: theme.size.touchTarget,
							padding: 0,
							borderRadius: theme.radius.button,
						} as React.CSSProperties
					}
				>
					<svg
						aria-hidden="true"
						width={theme.size.navIcon}
						height={theme.size.navIcon}
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<path d="M5 5l10 10M15 5L5 15" />
					</svg>
				</button>
			</div>
			<div
				style={{
					display: "flex",
					flex: 1,
					flexDirection: "column",
					gap: theme.space.overlayGap,
					minHeight: 0,
					overflowY: "auto",
				}}
			>
				{children}
			</div>
			{footer ? <div style={{ flex: "none" }}>{footer}</div> : null}
		</aside>
	);
}
