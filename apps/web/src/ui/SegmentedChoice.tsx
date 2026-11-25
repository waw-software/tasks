import { type Priority, theme } from "@waw/design-tokens";
import { useId } from "react";
import "./SegmentedChoice.css";

export type SegmentedChoiceProps<T extends string | number> = {
	label: string;
	options: readonly {
		value: T;
		label: string;
		priority?: Priority;
		disabled?: boolean;
	}[];
	value: T | null;
	onValueChange: (value: T) => void;
	helperText?: string;
};

const priorityFills: Record<Priority, string> = {
	1: theme.color["accent-tint"],
	2: theme.color["warning-tint"],
	3: theme.label.blue.bg,
	4: theme.color.surface,
};

function cardStyle(
	priority: Priority | undefined,
	selected: boolean,
	disabled: boolean,
): React.CSSProperties {
	const priorityInk =
		priority === undefined ? undefined : theme.priority[priority];
	let ink: string = priorityInk ?? theme.color.ink;
	let edge: string = theme.color.muted;
	if (selected) edge = priorityInk ?? theme.color.ink;
	else if (disabled) edge = theme.color["border-strong"];
	// Only a fill that hover and press must not change is set here; an idle
	// enabled card takes its fill from the stylesheet.
	let fill: string | undefined;
	if (disabled) {
		ink = theme.color.muted;
		fill = theme.color.surface;
	} else if (selected) {
		if (priority === undefined) {
			ink = theme.color.bg;
			fill = theme.color.ink;
		} else {
			fill = priorityFills[priority];
		}
	}
	return {
		borderWidth: selected ? theme.size.focusRing : theme.size.controlBorder,
		borderStyle: disabled ? "dashed" : "solid",
		borderColor: edge,
		backgroundColor: fill,
		color: ink,
	};
}

export function SegmentedChoice<T extends string | number>({
	label,
	options,
	value,
	onValueChange,
	helperText,
}: SegmentedChoiceProps<T>): React.JSX.Element {
	const name = useId();
	const helperId = useId();
	return (
		<fieldset
			className="waw-segments"
			aria-describedby={helperText ? helperId : undefined}
			style={
				{
					"--waw-bg": theme.color.bg,
					"--waw-bg-hover": theme.color.surface,
					"--waw-bg-active": theme.color.divider,
					"--waw-focus": theme.color["accent-text"],
					"--waw-focus-width": `${theme.size.focusRing}px`,
					"--waw-focus-offset": `${theme.space.focusOffset}px`,
					minWidth: 0,
					margin: 0,
					padding: 0,
					border: "none",
					fontFamily: `${theme.font.body}, system-ui, sans-serif`,
				} as React.CSSProperties
			}
		>
			<legend
				style={{
					padding: `0 0 ${theme.space.segmentGap}px`,
					fontSize: theme.type.group,
					fontWeight: theme.font.semibold,
					letterSpacing: theme.type.groupLetterSpacing,
					color: theme.color.muted,
				}}
			>
				{label}
			</legend>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
					gap: theme.space.segmentGap,
				}}
			>
				{options.map((option) => {
					const selected = option.value === value;
					const disabled = option.disabled === true;
					return (
						<label
							key={option.value}
							className="waw-segment"
							style={{ position: "relative", display: "grid" }}
						>
							<input
								type="radio"
								name={name}
								aria-label={option.label}
								checked={selected}
								disabled={disabled}
								onChange={() => onValueChange(option.value)}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									width: "100%",
									height: "100%",
									margin: 0,
									opacity: 0,
									cursor: disabled ? "not-allowed" : "pointer",
								}}
							/>
							<span
								aria-hidden="true"
								data-part="face"
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									boxSizing: "border-box",
									minWidth: 0,
									minHeight: theme.size.touchTarget,
									borderRadius: theme.radius.input,
									fontSize: theme.type.controlSupport,
									fontWeight: theme.font.semibold,
									overflowWrap: "anywhere",
									textAlign: "center",
									// The input on top receives the pointer, so that it
									// matches :hover and :active.
									pointerEvents: "none",
									...cardStyle(option.priority, selected, disabled),
								}}
							>
								{option.label}
							</span>
						</label>
					);
				})}
			</div>
			{helperText ? (
				<p
					id={helperId}
					style={{
						margin: `${theme.space.segmentGap}px 0 0`,
						fontSize: theme.type.meta,
						fontWeight: theme.font.regular,
						color: theme.color.muted,
					}}
				>
					{helperText}
				</p>
			) : null}
		</fieldset>
	);
}
