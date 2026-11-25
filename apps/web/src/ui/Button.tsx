import { theme } from "@waw/design-tokens";
import "./Button.css";

type ButtonBase = {
	label: string;
	onPress: () => void;
	size?: "regular" | "compact";
	fullWidth?: boolean;
};

export type ButtonProps =
	| (ButtonBase & { variant: "primary" | "secondary"; disabled?: boolean })
	| (ButtonBase & { variant: "text" });

type StateColors = {
	bg: string;
	ink: string;
	edge: string;
	hoverBg: string;
	hoverInk: string;
	activeBg: string;
	activeInk: string;
};

const enabledColors: Record<ButtonProps["variant"], StateColors> = {
	primary: {
		bg: theme.color.accent,
		ink: theme.color.bg,
		edge: theme.color.accent,
		hoverBg: theme.color["accent-dark"],
		hoverInk: theme.color.bg,
		activeBg: theme.color["accent-dark"],
		activeInk: theme.color.bg,
	},
	secondary: {
		bg: theme.color.bg,
		ink: theme.color.ink,
		edge: theme.color["border-strong"],
		hoverBg: theme.color.surface,
		hoverInk: theme.color.ink,
		activeBg: theme.color.divider,
		activeInk: theme.color.ink,
	},
	text: {
		bg: "transparent",
		ink: theme.color["accent-text"],
		edge: "transparent",
		hoverBg: "transparent",
		hoverInk: theme.color["accent-dark"],
		activeBg: "transparent",
		activeInk: theme.color["accent-dark"],
	},
};

function disabledColors(variant: "primary" | "secondary"): StateColors {
	const bg = theme.color.surface;
	const ink = theme.color.muted;
	return {
		bg,
		ink,
		edge: variant === "primary" ? bg : theme.color["border-strong"],
		hoverBg: bg,
		hoverInk: ink,
		activeBg: bg,
		activeInk: ink,
	};
}

export function Button(props: ButtonProps): React.JSX.Element {
	const { label, onPress, variant, size = "regular", fullWidth } = props;
	const disabled = props.variant !== "text" && props.disabled === true;
	const colors =
		props.variant !== "text" && disabled
			? disabledColors(props.variant)
			: enabledColors[variant];
	const primary = variant === "primary";
	const regularPrimary = primary && size === "regular";
	const paddingInline = {
		primary: theme.space.primaryButtonInline,
		secondary: theme.space.buttonInline,
		text: theme.space.textButtonInline,
	}[variant];

	return (
		<button
			type="button"
			className="waw-button"
			data-variant={variant}
			data-size={size}
			disabled={disabled}
			onClick={() => onPress()}
			style={
				{
					"--waw-bg": colors.bg,
					"--waw-ink": colors.ink,
					"--waw-edge": colors.edge,
					"--waw-bg-hover": colors.hoverBg,
					"--waw-ink-hover": colors.hoverInk,
					"--waw-bg-active": colors.activeBg,
					"--waw-ink-active": colors.activeInk,
					"--waw-focus": theme.color["accent-text"],
					boxSizing: "border-box",
					minWidth: theme.size.touchTarget,
					maxWidth: "100%",
					minHeight: regularPrimary
						? theme.size.desktopPrimary
						: theme.size.touchTarget,
					width: fullWidth ? "100%" : undefined,
					padding: `0 ${paddingInline}px`,
					borderRadius: primary ? theme.radius.primary : theme.radius.button,
					fontFamily: `${theme.font.body}, system-ui, sans-serif`,
					fontSize: regularPrimary ? theme.type.bodyMax : theme.type.bodyMin,
					fontWeight: primary ? theme.font.semibold : theme.font.medium,
					overflowWrap: "anywhere",
				} as React.CSSProperties
			}
		>
			{label}
		</button>
	);
}
