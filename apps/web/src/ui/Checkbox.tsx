import { theme } from "@waw/design-tokens";
import "./Checkbox.css";

export type CheckboxProps = {
	checked: boolean;
	label: string;
	onCheckedChange: (checked: boolean) => void;
};

export function Checkbox({
	checked,
	label,
	onCheckedChange,
}: CheckboxProps): React.JSX.Element {
	const edge = checked ? theme.color.ink : theme.color.muted;
	return (
		<span
			className="waw-checkbox"
			style={
				{
					"--waw-focus": theme.color["accent-text"],
					position: "relative",
					display: "flex",
					flexShrink: 0,
					alignItems: "center",
					justifyContent: "center",
					width: theme.size.touchTarget,
					height: theme.size.touchTarget,
				} as React.CSSProperties
			}
		>
			<input
				type="checkbox"
				aria-label={label}
				checked={checked}
				onChange={(event) => onCheckedChange(event.target.checked)}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					margin: 0,
					opacity: 0,
					cursor: "pointer",
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
					width: theme.size.checkbox,
					height: theme.size.checkbox,
					borderWidth: 1,
					borderStyle: "solid",
					borderColor: edge,
					borderRadius: theme.radius.checkbox,
					background: checked ? theme.color.ink : theme.color.bg,
					pointerEvents: "none",
				}}
			>
				{checked ? (
					<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
						<polyline
							points="2.5,7.5 5.5,10.5 11.5,3.5"
							fill="none"
							stroke={theme.color.bg}
							strokeWidth="2"
						/>
					</svg>
				) : null}
			</span>
		</span>
	);
}
