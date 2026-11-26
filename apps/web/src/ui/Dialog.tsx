import { ModalSurface, type OverlayProps } from "./ModalSurface.tsx";

export type DialogProps = OverlayProps;

export function Dialog(props: DialogProps): React.JSX.Element {
	return (
		<ModalSurface {...props} placement="center" closeLabel="Close dialog" />
	);
}
