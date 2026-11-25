import { type LabelColor, theme } from "@waw/design-tokens";

export type LabelChipProps = {
	name: string;
	color: LabelColor;
	on?: "bg" | "surface";
};

export function LabelChip({
	name,
	color,
	on = "bg",
}: LabelChipProps): React.JSX.Element {
	const { bg, ink, surfaceBg, surfaceInk } = theme.label[color];
	return (
		<span
			style={{
				display: "inline-block",
				padding: `${theme.space.chipBlock}px ${theme.space.chipInline}px`,
				borderRadius: theme.radius.chip,
				fontSize: theme.type.chip,
				fontWeight: theme.font.medium,
				background: on === "surface" ? surfaceBg : bg,
				color: on === "surface" ? surfaceInk : ink,
			}}
		>
			{name}
		</span>
	);
}
