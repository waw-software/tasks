import { theme } from "@waw/design-tokens";
import { Banner } from "../ui/Banner.tsx";
import { Button } from "../ui/Button.tsx";

export type ShellProps = {
	limited: boolean;
	onSignOut?: () => void;
	signOutPending?: boolean;
	signOutError?: string;
	onCheckAgain?: () => void;
};

export function Shell({
	limited,
	onSignOut,
	signOutPending = false,
	signOutError,
	onCheckAgain,
}: ShellProps): React.JSX.Element {
	return (
		<main
			style={{
				display: "flex",
				flexDirection: "column",
				gap: theme.space.dialogPadding,
				padding: `${theme.space.mainBlock}px ${theme.space.sheetPadding}px`,
				background: theme.color.bg,
				color: theme.color.ink,
				fontFamily: `${theme.font.body}, system-ui, sans-serif`,
			}}
		>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: theme.space.swatchGap,
				}}
			>
				<h1 style={{ margin: 0, fontSize: theme.type.screen }}>WAW Tasks</h1>
				{onSignOut ? (
					<Button
						variant="secondary"
						label="Sign out"
						disabled={signOutPending}
						onPress={onSignOut}
					/>
				) : null}
			</div>
			{signOutError ? (
				<p
					role="alert"
					style={{
						margin: 0,
						fontSize: theme.type.bodyMin,
						color: theme.color["accent-text"],
					}}
				>
					{signOutError}
				</p>
			) : null}
			{limited ? (
				<Banner
					tone="update"
					title="Your server needs an update"
					message="Newer features stay off until the server is updated."
					{...(onCheckAgain
						? { action: { label: "Check again", onPress: onCheckAgain } }
						: {})}
				/>
			) : null}
		</main>
	);
}
