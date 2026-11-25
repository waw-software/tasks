import { theme } from "@waw/design-tokens";

export type ProgressBarProps = { done: number; total: number };

export function ProgressBar({
	done,
	total,
}: ProgressBarProps): React.JSX.Element | null {
	if (total <= 0) {
		return null;
	}
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
			<div
				role="progressbar"
				aria-label="Tasks done"
				aria-valuemin={0}
				aria-valuemax={total}
				aria-valuenow={done}
				style={{
					flex: 1,
					height: theme.size.progress,
					overflow: "hidden",
					borderRadius: theme.radius.pill,
					background: theme.color.divider,
				}}
			>
				<div
					style={{
						width: `${(done / total) * 100}%`,
						height: "100%",
						borderRadius: theme.radius.pill,
						background: theme.color.ink,
					}}
				/>
			</div>
			<span style={{ fontSize: theme.type.meta, color: theme.color.muted }}>
				{done} of {total} done
			</span>
		</div>
	);
}
