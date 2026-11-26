import { theme } from "@waw/design-tokens";
import "./TabBar.css";

export type TabId = "today" | "upcoming" | "search" | "browse";
export type TabBarProps = {
	activeTab: TabId;
	onTabChange: (tab: TabId) => void;
	onAdd?: () => void;
};

const tabs: readonly { id: TabId; label: string; path: string }[] = [
	{
		id: "today",
		label: "Today",
		path: "M6 5h12a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z M4 10h16 M9 3v4 M15 3v4",
	},
	{ id: "upcoming", label: "Upcoming", path: "M4 7h16 M4 12h16 M4 17h9" },
	{
		id: "search",
		label: "Search",
		path: "M11 4a7 7 0 100 14 7 7 0 000-14z M20 20l-4-4",
	},
	{
		id: "browse",
		label: "Browse",
		path: "M4 5h7v7H4z M13 5h7v7h-7z M4 14h7v5H4z M13 14h7v5h-7z",
	},
];

const stateVariables = {
	"--waw-focus": theme.color["accent-text"],
	"--waw-focus-width": `${theme.size.focusRing}px`,
	"--waw-focus-offset": `${theme.space.focusOffset}px`,
};

function Icon(props: {
	path: string;
	size: number;
	strokeWidth: number;
}): React.JSX.Element {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			width={props.size}
			height={props.size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={props.strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d={props.path} />
		</svg>
	);
}

/** The bar with its floating add button. The host decides where it sits. */
export function TabBar({
	activeTab,
	onTabChange,
	onAdd,
}: TabBarProps): React.JSX.Element {
	return (
		<div
			style={{
				position: "relative",
				// Room for the floating button, so that it stays inside these bounds.
				paddingTop: onAdd ? theme.size.fab + theme.space.fabAboveTab : 0,
				// The room above the bar must not block the content behind it.
				pointerEvents: "none",
			}}
		>
			{onAdd ? (
				<button
					type="button"
					className="waw-fab"
					aria-label="Add task"
					onClick={() => onAdd()}
					style={
						{
							...stateVariables,
							"--waw-bg": theme.color.accent,
							"--waw-ink": theme.color.bg,
							"--waw-bg-hover": theme.color["accent-dark"],
							"--waw-bg-active": theme.color["accent-dark"],
							position: "absolute",
							top: 0,
							right: theme.space.fabInline,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: theme.size.fab,
							height: theme.size.fab,
							padding: 0,
							borderRadius: theme.radius.overlayMax,
							pointerEvents: "auto",
						} as React.CSSProperties
					}
				>
					<Icon
						path="M12 5v14M5 12h14"
						size={theme.size.fabIcon}
						strokeWidth={2.2}
					/>
				</button>
			) : null}
			<nav
				aria-label="Main"
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
					padding: `${theme.space.tabTop}px ${theme.space.tabInline}px 0`,
					borderTop: `${theme.size.controlBorder}px solid ${theme.color.divider}`,
					backgroundColor: theme.color.bg,
					pointerEvents: "auto",
				}}
			>
				{tabs.map(({ id, label, path }) => {
					const current = id === activeTab;
					return (
						<button
							key={id}
							type="button"
							className="waw-tab"
							aria-current={current ? "page" : undefined}
							onClick={() => onTabChange(id)}
							style={
								{
									...stateVariables,
									"--waw-bg": theme.color.bg,
									"--waw-ink": current ? theme.color.accent : theme.color.muted,
									"--waw-bg-hover": theme.color.surface,
									"--waw-bg-active": theme.color.divider,
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: theme.space.tabIconGap,
									minWidth: theme.size.touchTarget,
									minHeight: theme.size.tab,
									padding: 0,
									fontFamily: `${theme.font.body}, system-ui, sans-serif`,
									fontSize: theme.type.tab,
									fontWeight: current ? theme.font.semibold : theme.font.medium,
								} as React.CSSProperties
							}
						>
							<Icon path={path} size={theme.size.navIcon} strokeWidth={1.8} />
							<span
								style={{
									maxWidth: "100%",
									overflowWrap: "anywhere",
									// Always present, so that selection does not move the label.
									borderBottom: `${theme.size.focusRing}px solid ${current ? theme.color.accent : "transparent"}`,
								}}
							>
								{label}
							</span>
						</button>
					);
				})}
			</nav>
		</div>
	);
}
