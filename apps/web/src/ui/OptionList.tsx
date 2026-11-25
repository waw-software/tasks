import { type LabelColor, theme } from "@waw/design-tokens";
import { useId } from "react";
import { Button } from "./Button.tsx";
import { LabelChip } from "./LabelChip.tsx";
import "./OptionList.css";

export type ListOption<T extends string> = {
	value: T;
	label: string;
	detail?: string;
	labelColor?: LabelColor;
	disabled?: boolean;
};

type OptionListBase<T extends string> = {
	label: string;
	options: readonly ListOption<T>[];
	helperText?: string;
	action?: { label: string; onPress: () => void };
};

export type OptionListProps<T extends string> = OptionListBase<T> &
	(
		| { mode: "single"; value: T | null; onValueChange: (value: T) => void }
		| {
				mode: "multiple";
				value: readonly T[];
				onValueChange: (value: T[]) => void;
		  }
	);

export function OptionList<T extends string>(
	props: OptionListProps<T>,
): React.JSX.Element {
	const { label, options, helperText, action } = props;
	const name = useId();
	const legendId = useId();
	const helperId = useId();

	const isSelected = (value: T): boolean =>
		props.mode === "single"
			? props.value === value
			: props.value.includes(value);

	const select = (value: T): void => {
		if (props.mode === "single") {
			props.onValueChange(value);
			return;
		}
		props.onValueChange(
			props.value.includes(value)
				? props.value.filter((selected) => selected !== value)
				: [...props.value, value],
		);
	};

	return (
		<div
			className="waw-option-list"
			style={
				{
					"--waw-bg": theme.color.bg,
					"--waw-bg-hover": theme.color.surface,
					"--waw-bg-active": theme.color.divider,
					"--waw-divider": theme.color.divider,
					"--waw-border": `${theme.size.controlBorder}px`,
					"--waw-radius-inner": `${theme.radius.card - theme.size.controlBorder}px`,
					"--waw-focus": theme.color["accent-text"],
					"--waw-focus-width": `${theme.size.focusRing}px`,
					"--waw-focus-offset": `${theme.space.focusOffset}px`,
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-start",
					gap: theme.space.segmentGap,
					fontFamily: `${theme.font.body}, system-ui, sans-serif`,
				} as React.CSSProperties
			}
		>
			<fieldset
				role={props.mode === "single" ? "radiogroup" : undefined}
				aria-labelledby={legendId}
				aria-describedby={helperText ? helperId : undefined}
				style={{
					alignSelf: "stretch",
					minWidth: 0,
					margin: 0,
					padding: 0,
					border: "none",
				}}
			>
				<legend
					id={legendId}
					style={{
						padding: 0,
						marginBottom: theme.space.segmentGap,
						fontSize: theme.type.group,
						fontWeight: theme.font.semibold,
						letterSpacing: theme.type.groupLetterSpacing,
						textTransform: "uppercase",
						color: theme.color.muted,
					}}
				>
					{label}
				</legend>
				{options.length > 0 ? (
					<div
						style={{
							borderWidth: theme.size.controlBorder,
							borderStyle: "solid",
							borderColor: theme.color.border,
							borderRadius: theme.radius.card,
						}}
					>
						{options.map((option) => {
							const checked = isSelected(option.value);
							const disabled = option.disabled === true;
							return (
								<label
									key={option.value}
									className="waw-option-row"
									data-disabled={disabled || undefined}
									style={{
										position: "relative",
										display: "flex",
										alignItems: "center",
										gap: theme.space.optionGap,
										boxSizing: "border-box",
										width: "100%",
										minHeight: theme.size.optionRow,
										paddingInline: theme.space.optionInline,
										color: disabled ? theme.color.muted : theme.color.ink,
									}}
								>
									<input
										type={props.mode === "single" ? "radio" : "checkbox"}
										name={props.mode === "single" ? name : undefined}
										checked={checked}
										disabled={disabled}
										onChange={() => select(option.value)}
										style={{
											position: "absolute",
											width: 1,
											height: 1,
											margin: 0,
											opacity: 0,
										}}
									/>
									<Face
										mode={props.mode}
										checked={checked}
										disabled={disabled}
									/>
									<span
										style={{
											flexGrow: 1,
											minWidth: 0,
											overflowWrap: "anywhere",
											fontSize: theme.type.bodyMin,
											fontWeight: theme.font.regular,
										}}
									>
										{option.labelColor ? (
											<LabelChip
												name={option.label}
												color={option.labelColor}
											/>
										) : (
											option.label
										)}
									</span>
									{option.detail ? (
										<span
											style={{
												fontSize: theme.type.meta,
												color: theme.color.muted,
											}}
										>
											{option.detail}
										</span>
									) : null}
								</label>
							);
						})}
					</div>
				) : null}
			</fieldset>
			{helperText ? (
				<p
					id={helperId}
					style={{
						margin: 0,
						fontSize: theme.type.meta,
						color: theme.color.muted,
					}}
				>
					{helperText}
				</p>
			) : null}
			{action ? (
				// A row as high as an option row, which stretches the button. The
				// padding lines the button text up with the row content.
				<div
					style={{
						display: "flex",
						minHeight: theme.size.optionRow,
						paddingInline:
							theme.space.optionInline - theme.space.textButtonInline,
					}}
				>
					<Button
						variant="text"
						label={action.label}
						onPress={action.onPress}
					/>
				</div>
			) : null}
		</div>
	);
}

/** Decorative: the visually hidden input of the row carries the state. */
function Face({
	mode,
	checked,
	disabled,
}: {
	mode: "single" | "multiple";
	checked: boolean;
	disabled: boolean;
}): React.JSX.Element {
	const radio = mode === "single";
	const selectedColor = radio ? theme.color.accent : theme.color.ink;
	return (
		<span
			aria-hidden="true"
			data-part="face"
			style={{
				display: "flex",
				flexShrink: 0,
				alignItems: "center",
				justifyContent: "center",
				boxSizing: "border-box",
				width: theme.size.checkbox,
				height: theme.size.checkbox,
				borderWidth: theme.size.controlBorder,
				borderStyle: disabled ? "dashed" : "solid",
				borderColor: checked ? selectedColor : theme.color.muted,
				borderRadius: radio ? theme.radius.pill : theme.radius.checkbox,
				background: checked && !radio ? selectedColor : theme.color.bg,
			}}
		>
			{checked && radio ? (
				<span
					data-part="dot"
					style={{
						width: theme.size.radioDot,
						height: theme.size.radioDot,
						borderRadius: theme.radius.pill,
						background: selectedColor,
					}}
				/>
			) : null}
			{checked && !radio ? (
				<svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14">
					<polyline
						points="2.5,7.5 5.5,10.5 11.5,3.5"
						fill="none"
						stroke={theme.color.bg}
						strokeWidth="2"
					/>
				</svg>
			) : null}
		</span>
	);
}
