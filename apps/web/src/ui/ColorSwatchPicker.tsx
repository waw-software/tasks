import { type LabelColor, type ProjectColor, theme } from "@waw/design-tokens";
import { useId } from "react";
import "./ColorSwatchPicker.css";

export type ColorSwatchPickerProps = { label: string } & (
	| {
			palette: "project";
			value: ProjectColor | null;
			onValueChange: (value: ProjectColor) => void;
	  }
	| {
			palette: "label";
			value: LabelColor | null;
			onValueChange: (value: LabelColor) => void;
	  }
);

type Swatch = {
	name: string;
	fill: string;
	edge: string | undefined;
	tick: string;
	selected: boolean;
	select: () => void;
};

const projectOrder = [
	"red",
	"blue",
	"green",
	"amber",
	"violet",
	"black",
] as const satisfies readonly ProjectColor[];

const labelOrder = [
	"green",
	"blue",
	"amber",
	"violet",
] as const satisfies readonly LabelColor[];

const hueNames: Record<ProjectColor, string> = {
	red: "Red",
	blue: "Blue",
	green: "Green",
	amber: "Amber",
	violet: "Violet",
	black: "Black",
};

function swatchesOf(props: ColorSwatchPickerProps): Swatch[] {
	if (props.palette === "project") {
		return projectOrder.map((color) => ({
			name: hueNames[color],
			fill: theme.project[color],
			edge: undefined,
			tick: theme.color.bg,
			selected: props.value === color,
			select: () => props.onValueChange(color),
		}));
	}
	return labelOrder.map((color) => ({
		name: hueNames[color],
		fill: theme.label[color].bg,
		edge: theme.label[color].ink,
		tick: theme.label[color].ink,
		selected: props.value === color,
		select: () => props.onValueChange(color),
	}));
}

export function ColorSwatchPicker(
	props: ColorSwatchPickerProps,
): React.JSX.Element {
	const name = useId();
	const labelId = useId();
	const swatches = swatchesOf(props);
	const selectedName = swatches.find((swatch) => swatch.selected)?.name;
	return (
		<fieldset
			className="waw-swatches"
			aria-labelledby={labelId}
			style={
				{
					"--waw-ring-gap": theme.color.bg,
					"--waw-ring": theme.color.ink,
					"--waw-ring-width": `${theme.size.focusRing}px`,
					"--waw-hover": theme.color["border-strong"],
					"--waw-focus": theme.color["accent-text"],
					"--waw-focus-width": `${theme.size.focusRing}px`,
					// Outside both selection rings.
					"--waw-focus-offset": `${theme.space.focusOffset + 2 * theme.size.focusRing}px`,
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
					padding: `0 0 ${theme.space.swatchLabelGap}px`,
					fontSize: theme.type.meta,
					fontWeight: theme.font.medium,
					color: theme.color.muted,
				}}
			>
				{/* Only this names the group, so the name does not change with the hue. */}
				<span id={labelId}>{props.label}</span>
				{selectedName ? <span> · {selectedName}</span> : null}
			</legend>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: theme.space.swatchGap,
				}}
			>
				{swatches.map((swatch) => (
					<label
						key={swatch.name}
						className="waw-swatch"
						style={{
							position: "relative",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							// Clear of the selection and focus rings around the circle.
							gap: theme.space.swatchLabelGap,
						}}
					>
						<input
							type="radio"
							name={name}
							aria-label={swatch.name}
							checked={swatch.selected}
							onChange={swatch.select}
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
								width: theme.size.touchTarget,
								height: theme.size.touchTarget,
								border: swatch.edge
									? `${theme.size.controlBorder}px solid ${swatch.edge}`
									: "none",
								borderRadius: theme.radius.pill,
								backgroundColor: swatch.fill,
								pointerEvents: "none",
							}}
						>
							{swatch.selected ? (
								<svg
									aria-hidden="true"
									width={theme.size.pickerMark}
									height={theme.size.pickerMark}
									viewBox="0 0 14 14"
								>
									<polyline
										points="2.5,7.5 5.5,10.5 11.5,3.5"
										fill="none"
										stroke={swatch.tick}
										strokeWidth="2"
									/>
								</svg>
							) : null}
						</span>
						<span
							aria-hidden="true"
							style={{
								fontSize: theme.type.group,
								fontWeight: theme.font.regular,
								color: theme.color.muted,
								pointerEvents: "none",
							}}
						>
							{swatch.name}
						</span>
					</label>
				))}
			</div>
		</fieldset>
	);
}
