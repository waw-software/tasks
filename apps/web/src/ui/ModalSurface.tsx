import { theme } from "@waw/design-tokens";
import { type ReactNode, useId, useLayoutEffect, useRef } from "react";
import "./ModalSurface.css";

export type DismissReason = "close" | "escape" | "backdrop";

export type OverlayProps = {
	open: boolean;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	onDismiss: (reason: DismissReason) => void;
	dismissOnBackdrop?: boolean;
	onAfterClose?: () => void;
};

type ModalSurfaceProps = OverlayProps & {
	placement: "center" | "bottom";
	closeLabel: string;
};

// Room for the focus ring inside the scroll region, which would clip it.
const focusRoom = theme.size.focusRing + theme.space.focusOffset;

const corner = theme.radius.overlayMax;

const placements: Record<ModalSurfaceProps["placement"], React.CSSProperties> =
	{
		center: {
			width: `calc(100% - ${2 * theme.space.dialogInset}px)`,
			maxWidth: theme.size.dialogMax,
			maxHeight: `calc(100dvh - ${2 * theme.space.dialogInset}px)`,
			margin: "auto",
			padding: theme.space.dialogPadding,
			borderRadius: corner,
			boxShadow: theme.overlay.dialogShadow,
		},
		bottom: {
			width: "100%",
			maxWidth: "none",
			maxHeight: `${theme.size.sheetMaxHeightPercent}dvh`,
			margin: "auto 0 0",
			paddingTop: theme.space.sheetPadding,
			paddingInline: theme.space.sheetPadding,
			paddingBottom: `calc(${theme.space.sheetBottom}px + env(safe-area-inset-bottom))`,
			borderRadius: `${corner}px ${corner}px 0 0`,
			boxShadow: "none",
		},
	};

const tabStops =
	"a[href], button, input, select, textarea, summary, [tabindex], [contenteditable='true']";

// A native modal dialog still lets Tab leave for the browser's own controls.
function wrapTab(
	event: React.KeyboardEvent<HTMLDialogElement>,
	title: HTMLElement | null,
): void {
	const stops = Array.from(
		event.currentTarget.querySelectorAll<HTMLElement>(tabStops),
	).filter(
		(element) =>
			element.tabIndex >= 0 &&
			!element.matches(":disabled, input[type='hidden']") &&
			(element.checkVisibility?.({ visibilityProperty: true }) ?? true),
	);
	const first = stops[0];
	const last = stops.at(-1);
	if (!first || !last) return;
	const active = document.activeElement;
	// The title, focused on open, comes before the first stop.
	const atStart = active === first || active === title;
	let target: HTMLElement | undefined;
	if (event.shiftKey && atStart) target = last;
	else if (!event.shiftKey && active === last) target = first;
	if (!target) return;
	event.preventDefault();
	target.focus();
}

// True for the area around the surface. Its padding targets the dialog too.
function onBackdrop(event: React.PointerEvent<HTMLDialogElement>): boolean {
	if (event.target !== event.currentTarget || event.button !== 0) return false;
	const box = event.currentTarget.getBoundingClientRect();
	return !(
		event.clientX >= box.left &&
		event.clientX < box.right &&
		event.clientY >= box.top &&
		event.clientY < box.bottom
	);
}

function CloseButton({
	label,
	onPress,
}: {
	label: string;
	onPress: () => void;
}): React.JSX.Element {
	return (
		<button
			type="button"
			className="waw-modal-close"
			aria-label={label}
			onClick={() => onPress()}
			style={{
				display: "flex",
				flexShrink: 0,
				alignItems: "center",
				justifyContent: "center",
				width: theme.size.touchTarget,
				height: theme.size.touchTarget,
				padding: 0,
				border: "none",
				borderRadius: theme.radius.button,
				color: theme.color.ink,
			}}
		>
			<svg
				aria-hidden="true"
				width={theme.size.navIcon}
				height={theme.size.navIcon}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			>
				<path d="M6 6l12 12M18 6L6 18" />
			</svg>
		</button>
	);
}

export function ModalSurface({
	open,
	title,
	children,
	footer,
	onDismiss,
	dismissOnBackdrop = false,
	onAfterClose,
	placement,
	closeLabel,
}: ModalSurfaceProps): React.JSX.Element {
	const titleId = useId();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const titleRef = useRef<HTMLHeadingElement>(null);
	// Set while the surface is shown, so that only a real close is reported.
	const shown = useRef<{ launcher: Element | null } | null>(null);
	const pressedBackdrop = useRef(false);

	useLayoutEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open) {
			if (shown.current) return;
			shown.current = { launcher: document.activeElement };
			dialog.showModal();
			titleRef.current?.focus();
			return;
		}
		if (!shown.current) return;
		const { launcher } = shown.current;
		shown.current = null;
		pressedBackdrop.current = false;
		dialog.close();
		if (launcher instanceof HTMLElement && launcher.isConnected) {
			launcher.focus();
		}
		onAfterClose?.();
	}, [open, onAfterClose]);

	return (
		<dialog
			ref={dialogRef}
			className="waw-modal"
			aria-labelledby={open ? titleId : undefined}
			onCancel={(event) => {
				// A file input's own cancel event bubbles up to here.
				if (event.target !== event.currentTarget) return;
				event.preventDefault();
				onDismiss("escape");
			}}
			onKeyDown={(event) => {
				if (event.defaultPrevented) return;
				if (event.key === "Tab") wrapTab(event, titleRef.current);
				if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
				// Chromium closes on a second native request even though the first
				// was prevented, so the key must not raise one.
				event.preventDefault();
				onDismiss("escape");
			}}
			onPointerDown={(event) => {
				pressedBackdrop.current = onBackdrop(event);
			}}
			onPointerUp={(event) => {
				const pressed = pressedBackdrop.current;
				pressedBackdrop.current = false;
				if (pressed && dismissOnBackdrop && onBackdrop(event)) {
					onDismiss("backdrop");
				}
			}}
			style={
				{
					"--waw-scrim": theme.overlay.scrim,
					"--waw-bg-hover": theme.color.surface,
					"--waw-bg-active": theme.color.divider,
					"--waw-focus": theme.color["accent-text"],
					"--waw-focus-width": `${theme.size.focusRing}px`,
					"--waw-focus-offset": `${theme.space.focusOffset}px`,
					...placements[placement],
					boxSizing: "border-box",
					flexDirection: "column",
					gap: theme.space.overlayGap,
					border: "none",
					overflow: "hidden",
					background: theme.color.bg,
					color: theme.color.ink,
					fontFamily: `${theme.font.body}, system-ui, sans-serif`,
					fontSize: theme.type.bodyMin,
				} as React.CSSProperties
			}
		>
			{open ? (
				<>
					<div
						style={{
							display: "flex",
							flexShrink: 0,
							alignItems: "center",
							gap: theme.space.overlayGap,
						}}
					>
						<h1
							ref={titleRef}
							id={titleId}
							className="waw-modal-title"
							tabIndex={-1}
							style={{
								flex: 1,
								minWidth: 0,
								margin: 0,
								overflowWrap: "anywhere",
								fontFamily: `"${theme.font.heading}", system-ui, sans-serif`,
								fontSize: theme.type.sectionMin,
								fontWeight: theme.font.semibold,
							}}
						>
							{title}
						</h1>
						<CloseButton
							label={closeLabel}
							onPress={() => onDismiss("close")}
						/>
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							flex: "0 1 auto",
							gap: theme.space.overlayGap,
							minHeight: 0,
							overflowY: "auto",
							margin: -focusRoom,
							padding: focusRoom,
						}}
					>
						{children}
					</div>
					{footer ? <div style={{ flexShrink: 0 }}>{footer}</div> : null}
				</>
			) : null}
		</dialog>
	);
}
