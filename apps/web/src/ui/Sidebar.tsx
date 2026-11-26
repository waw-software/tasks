import { type LabelColor, type ProjectColor, theme } from "@waw/design-tokens";
import { useId } from "react";
import { Button } from "./Button.tsx";
import { LabelChip } from "./LabelChip.tsx";
import { ProjectMarker } from "./ProjectMarker.tsx";
import "./Sidebar.css";

// IDs are unique across all four link groups.
export type SidebarLink = {
	id: string;
	label: string;
	href: string;
	count?: number;
};

export type SidebarProps = {
	views: readonly SidebarLink[];
	projects: readonly (SidebarLink & { color: ProjectColor })[];
	labels: readonly (Omit<SidebarLink, "count"> & { color: LabelColor })[];
	filters: readonly SidebarLink[];
	activeId?: string;
	serverStatus: {
		label: string;
		tone: "synced" | "offline" | "neutral";
		href?: string;
	};
	onAdd: () => void;
	onNewProject?: () => void;
	onNavigate?: (id: string) => void;
};

type Navigation = {
	activeId: SidebarProps["activeId"] | undefined;
	onNavigate: SidebarProps["onNavigate"] | undefined;
};

const toneColors: Record<SidebarProps["serverStatus"]["tone"], string> = {
	synced: theme.color.success,
	offline: theme.color.warning,
	neutral: theme.color.muted,
};

// Room for the focus ring inside the scroll region, which would clip it.
const focusRoom = theme.size.focusRing + theme.space.focusOffset;

const listStyle: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: theme.space.sidebarRowGap,
	margin: 0,
	padding: 0,
	listStyle: "none",
};

const rowStyle: React.CSSProperties = {
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	minHeight: theme.size.touchTarget,
	padding: `0 ${theme.space.sidebarRowInline}px`,
	borderRadius: theme.radius.nav,
	textDecoration: "none",
	overflowWrap: "anywhere",
};

function countedName({ label, count }: SidebarLink): string | undefined {
	if (count === undefined) return undefined;
	return `${label}, ${count} ${count === 1 ? "task" : "tasks"}`;
}

function NavLink({
	link,
	activeId,
	onNavigate,
	style,
	children,
}: Navigation & {
	link: SidebarLink;
	style?: React.CSSProperties;
	children: React.ReactNode;
}): React.JSX.Element {
	const current = link.id === activeId;
	return (
		<a
			className="waw-sidebar-link"
			href={link.href}
			aria-current={current ? "page" : undefined}
			aria-label={countedName(link)}
			onClick={(event) => {
				// A secondary or modified click stays the browser's, e.g. a new tab.
				const modified =
					event.button !== 0 ||
					event.metaKey ||
					event.ctrlKey ||
					event.shiftKey ||
					event.altKey;
				if (!onNavigate || modified) return;
				event.preventDefault();
				onNavigate(link.id);
			}}
			style={
				{
					...rowStyle,
					"--waw-bg": current ? theme.color.bg : "transparent",
					color: theme.color.ink,
					fontSize: theme.type.bodyMin,
					fontWeight: current ? theme.font.semibold : theme.font.medium,
					...style,
				} as React.CSSProperties
			}
		>
			{children}
		</a>
	);
}

function RowContent({ link }: { link: SidebarLink }): React.JSX.Element {
	return (
		<>
			<span style={{ flex: 1, minWidth: 0 }}>{link.label}</span>
			{link.count === undefined ? null : (
				<span
					style={{
						fontSize: theme.type.meta,
						fontWeight: theme.font.regular,
						color: theme.color.muted,
					}}
				>
					{link.count}
				</span>
			)}
		</>
	);
}

function Group({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}): React.JSX.Element {
	const headingId = useId();
	return (
		<section aria-labelledby={headingId}>
			<h2
				id={headingId}
				style={{
					margin: 0,
					padding: `0 ${theme.space.sidebarRowInline}px ${theme.space.fieldGap}px`,
					fontFamily: `${theme.font.body}, system-ui, sans-serif`,
					fontSize: theme.type.group,
					fontWeight: theme.font.semibold,
					letterSpacing: theme.type.groupLetterSpacing,
					textTransform: "uppercase",
					color: theme.color.muted,
				}}
			>
				{title}
			</h2>
			{children}
		</section>
	);
}

function Wordmark(): React.JSX.Element {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: theme.space.sidebarRowInline,
				padding: `0 ${theme.space.sidebarChipGap}px`,
			}}
		>
			<span
				aria-hidden="true"
				style={{
					display: "flex",
					flexShrink: 0,
					alignItems: "center",
					justifyContent: "center",
					width: theme.size.sidebarWordmarkMark,
					height: theme.size.sidebarWordmarkMark,
					borderRadius: theme.radius.sidebarWordmarkMark,
					background: theme.color.accent,
					color: theme.color.bg,
				}}
			>
				<svg
					aria-hidden="true"
					width={theme.size.sidebarWordmarkIcon}
					height={theme.size.sidebarWordmarkIcon}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.6"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M20 6L9 17l-5-5" />
				</svg>
			</span>
			<span
				style={{
					fontFamily: `"${theme.font.heading}", system-ui, sans-serif`,
					fontSize: theme.type.sidebarWordmark,
					fontWeight: theme.font.semibold,
				}}
			>
				WAW Tasks
			</span>
		</div>
	);
}

function ServerStatus({
	label,
	tone,
	href,
}: SidebarProps["serverStatus"]): React.JSX.Element {
	const style: React.CSSProperties = {
		...rowStyle,
		flexShrink: 0,
		gap: theme.space.chipInline,
		color: theme.color["ink-2"],
		fontSize: theme.type.meta,
		fontWeight: theme.font.medium,
	};
	const content = (
		<>
			<span
				aria-hidden="true"
				style={{
					flexShrink: 0,
					width: theme.size.serverStatusDot,
					height: theme.size.serverStatusDot,
					borderRadius: theme.radius.pill,
					backgroundColor: toneColors[tone],
				}}
			/>
			<span>{label}</span>
		</>
	);
	if (href === undefined) {
		return <div style={style}>{content}</div>;
	}
	return (
		<a className="waw-sidebar-link" href={href} style={style}>
			{content}
		</a>
	);
}

export function Sidebar({
	views,
	projects,
	labels,
	filters,
	activeId,
	serverStatus,
	onAdd,
	onNewProject,
	onNavigate,
}: SidebarProps): React.JSX.Element {
	const navigation: Navigation = { activeId, onNavigate };
	const rows = (links: readonly SidebarLink[]) => (
		<ul style={listStyle}>
			{links.map((link) => (
				<li key={link.id}>
					<NavLink {...navigation} link={link}>
						<RowContent link={link} />
					</NavLink>
				</li>
			))}
		</ul>
	);

	return (
		<aside
			style={
				{
					"--waw-bg-hover": theme.color.divider,
					"--waw-press": theme.color.muted,
					"--waw-border": `${theme.size.controlBorder}px`,
					"--waw-focus": theme.color["accent-text"],
					"--waw-focus-width": `${theme.size.focusRing}px`,
					"--waw-focus-offset": `${theme.space.focusOffset}px`,
					boxSizing: "border-box",
					display: "flex",
					flexDirection: "column",
					flexShrink: 0,
					gap: theme.space.sidebarGroupGap,
					width: theme.size.sidebar,
					height: "100%",
					// For windows too short even for the parts around the lists.
					overflowY: "auto",
					padding: `${theme.space.sidebarBlock}px ${theme.space.sidebarInline}px`,
					background: theme.color.surface,
					color: theme.color.ink,
					fontFamily: `${theme.font.body}, system-ui, sans-serif`,
				} as React.CSSProperties
			}
		>
			<Wordmark />
			<div style={{ flexShrink: 0 }}>
				<Button
					label="Add task"
					variant="primary"
					size="compact"
					fullWidth
					onPress={onAdd}
				/>
			</div>
			{/* The lists scroll, so that the server status stays in view. */}
			<nav
				aria-label="Sidebar"
				style={{
					display: "flex",
					flexDirection: "column",
					flex: "1 1 0",
					gap: theme.space.sidebarGroupGap,
					minHeight: theme.size.touchTarget * 3,
					overflowY: "auto",
					margin: -focusRoom,
					padding: focusRoom,
				}}
			>
				<Group title="Views">{rows(views)}</Group>
				<Group title="Projects">
					<ul style={listStyle}>
						{projects.map((project) => (
							<li key={project.id}>
								<NavLink
									{...navigation}
									link={project}
									style={{ gap: theme.space.sidebarRowInline }}
								>
									<ProjectMarker color={project.color} />
									<RowContent link={project} />
								</NavLink>
							</li>
						))}
					</ul>
					{onNewProject ? (
						<Button
							label="New project"
							variant="text"
							size="compact"
							onPress={onNewProject}
						/>
					) : null}
				</Group>
				<Group title="Labels">
					<ul
						style={{
							...listStyle,
							flexDirection: "row",
							flexWrap: "wrap",
							gap: theme.space.sidebarChipGap,
						}}
					>
						{labels.map((label) => (
							<li key={label.id} style={{ maxWidth: "100%" }}>
								<NavLink
									{...navigation}
									link={label}
									style={{
										justifyContent: "center",
										minWidth: theme.size.touchTarget,
										padding: `0 ${theme.space.sidebarChipGap}px`,
									}}
								>
									<LabelChip
										name={label.label}
										color={label.color}
										on="surface"
									/>
								</NavLink>
							</li>
						))}
					</ul>
				</Group>
				<Group title="Filters">{rows(filters)}</Group>
			</nav>
			<ServerStatus {...serverStatus} />
		</aside>
	);
}
