import { ModalSurface, type OverlayProps } from "./ModalSurface.tsx";

export type { DismissReason } from "./ModalSurface.tsx";
export type SheetProps = OverlayProps;

export function Sheet(props: SheetProps): React.JSX.Element {
	return (
		<ModalSurface {...props} placement="bottom" closeLabel="Close sheet" />
	);
}
