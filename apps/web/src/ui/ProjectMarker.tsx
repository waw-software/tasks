import { type ProjectColor, theme } from "@waw/design-tokens";

export type ProjectMarkerProps = { color: ProjectColor };

export function ProjectMarker({
	color,
}: ProjectMarkerProps): React.JSX.Element {
	return (
		<span
			aria-hidden="true"
			data-color={color}
			style={{
				display: "inline-block",
				flexShrink: 0,
				width: theme.size.projectMarker,
				height: theme.size.projectMarker,
				borderRadius: theme.radius.projectMarker,
				background: theme.project[color],
			}}
		/>
	);
}
