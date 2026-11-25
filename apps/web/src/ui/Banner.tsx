import { theme } from "@waw/design-tokens";
import { Button } from "./Button.tsx";

export type BannerProps = {
	tone: "warning" | "success" | "update";
	title: string;
	message?: string;
	action?: { label: string; onPress: () => void };
};

const backgrounds: Record<BannerProps["tone"], string> = {
	warning: theme.color["warning-tint"],
	success: theme.color["success-tint"],
	update: theme.color["accent-tint"],
};

export function Banner({
	tone,
	title,
	message,
	action,
}: BannerProps): React.JSX.Element {
	const success = tone === "success";
	return (
		<div
			data-tone={tone}
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				gap: theme.space.bannerGap,
				padding: `${theme.space.bannerBlock}px ${theme.space.bannerInline}px`,
				borderRadius: success ? theme.radius.input : theme.radius.card,
				backgroundColor: backgrounds[tone],
				fontFamily: `${theme.font.body}, system-ui, sans-serif`,
			}}
		>
			<div
				role="status"
				aria-atomic="true"
				style={{
					display: "flex",
					flex: "1 1 320px",
					flexDirection: "column",
					gap: theme.space.bannerCopyGap,
					minWidth: 0,
					overflowWrap: "anywhere",
				}}
			>
				<span
					style={{
						fontSize: success ? theme.type.controlSupport : theme.type.bodyMin,
						fontWeight: success ? theme.font.medium : theme.font.semibold,
						color: success ? theme.color["success-text"] : theme.color.ink,
					}}
				>
					{title}
				</span>
				{message ? (
					<span
						style={{
							fontSize: theme.type.controlSupport,
							fontWeight: theme.font.regular,
							color: theme.color["ink-2"],
						}}
					>
						{message}
					</span>
				) : null}
			</div>
			{action ? (
				<div style={{ marginLeft: "auto", maxWidth: "100%" }}>
					<Button
						variant="text"
						size="compact"
						label={action.label}
						onPress={action.onPress}
					/>
				</div>
			) : null}
		</div>
	);
}
