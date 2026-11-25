import { theme } from "@waw/design-tokens";

export type GroupHeaderProps = {
	label: string;
	count?: number;
	tone?: "default" | "overdue";
};

export function GroupHeader({
	label,
	count,
	tone = "default",
}: GroupHeaderProps): React.JSX.Element {
	return (
		<h2
			style={{
				margin: 0,
				fontSize: theme.type.group,
				fontWeight: theme.font.semibold,
				letterSpacing: theme.type.groupLetterSpacing,
				textTransform: "uppercase",
				color:
					tone === "overdue" ? theme.color["accent-text"] : theme.color.muted,
			}}
		>
			{label}
			{count !== undefined && (
				<>
					{" "}
					<span>{count}</span>
				</>
			)}
		</h2>
	);
}
