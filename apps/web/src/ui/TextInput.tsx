import { theme } from "@waw/design-tokens";
import { useId } from "react";
import "./TextInput.css";

export type TextInputProps = {
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	kind?: "text" | "url" | "token";
	helperText?: string;
	errorText?: string;
	disabled?: boolean;
};

const inputTypes = { text: "text", url: "url", token: "password" } as const;

const supportStyle: React.CSSProperties = {
	margin: 0,
	fontFamily: theme.font.body,
	fontSize: theme.type.meta,
	fontWeight: theme.font.regular,
};

export function TextInput({
	label,
	value,
	onValueChange,
	kind = "text",
	helperText,
	errorText,
	disabled = false,
}: TextInputProps): React.JSX.Element {
	const id = useId();
	const helperId = useId();
	const errorId = useId();
	const technical = kind !== "text";
	const helper = errorText ? undefined : helperText;
	let describedBy: string | undefined;
	if (errorText) describedBy = errorId;
	else if (helper) describedBy = helperId;
	let edge: string = theme.color.muted;
	if (disabled) edge = theme.color["border-strong"];
	else if (errorText) edge = theme.color["accent-text"];

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: theme.space.fieldGap,
			}}
		>
			<label
				htmlFor={id}
				style={{
					fontFamily: theme.font.body,
					fontSize: theme.type.meta,
					fontWeight: theme.font.medium,
					color: theme.color.muted,
				}}
			>
				{label}
			</label>
			<input
				id={id}
				className="waw-input"
				type={inputTypes[kind]}
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				disabled={disabled}
				autoCapitalize={technical ? "off" : undefined}
				autoCorrect={technical ? "off" : undefined}
				spellCheck={technical ? false : undefined}
				aria-invalid={errorText ? "true" : undefined}
				aria-describedby={describedBy}
				style={
					{
						"--waw-focus": theme.color["accent-text"],
						boxSizing: "border-box",
						width: "100%",
						minHeight: theme.size.desktopInput,
						margin: 0,
						paddingBlock: 0,
						paddingInline: theme.space.inputInline,
						borderWidth: theme.size.controlBorder,
						borderStyle: "solid",
						borderColor: edge,
						borderRadius: theme.radius.input,
						background: theme.color.surface,
						color: disabled ? theme.color.muted : theme.color.ink,
						fontFamily: technical
							? `ui-monospace, Menlo, ${theme.font.mono}`
							: theme.font.body,
						fontSize: theme.type.bodyMax,
						fontWeight: theme.font.regular,
					} as React.CSSProperties
				}
			/>
			{helper ? (
				<p id={helperId} style={{ ...supportStyle, color: theme.color.muted }}>
					{helper}
				</p>
			) : null}
			{/* Stays mounted so that a later error is announced. Out of flow while
			    empty, so that it adds no flex gap. */}
			<p
				id={errorId}
				role="alert"
				style={{
					...supportStyle,
					color: theme.color["accent-text"],
					position: errorText ? undefined : "absolute",
				}}
			>
				{errorText}
			</p>
		</div>
	);
}
