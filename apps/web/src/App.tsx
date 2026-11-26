import type { SetupClaimResponse } from "@waw/api-contract";
import { useEffect, useState } from "react";
import { defaultBrowserConnectAdapter } from "./connect/browser.ts";
import { ConnectFlow } from "./connect/ConnectFlow.tsx";
import { ConnectView } from "./connect/ConnectView.tsx";
import { Shell } from "./connect/Shell.tsx";
import { UpdateServer } from "./connect/UpdateServer.tsx";
import Gallery from "./Gallery.tsx";
import { Setup } from "./Setup.tsx";

// Synthetic values for the visual check; the image is the QR code of the sample link.
const setupSample: SetupClaimResponse = {
	serverUrl: "https://tasks.example.com",
	accessToken: `waw_dev_${"A".repeat(43)}`,
	pairingLink: `https://tasks.example.com/pair#token=waw_pair_${"B".repeat(43)}`,
	qrDataUrl:
		"data:image/png;base64,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",
};

function useHash() {
	const [hash, setHash] = useState(() => window.location.hash);
	useEffect(() => {
		const update = () => setHash(window.location.hash);
		window.addEventListener("hashchange", update);
		return () => window.removeEventListener("hashchange", update);
	}, []);
	return hash;
}

function WebApp() {
	const [adapter] = useState(defaultBrowserConnectAdapter);
	return <ConnectFlow origin={window.location.origin} adapter={adapter} />;
}

export default function App() {
	const hash = useHash();
	const galleryEnabled =
		import.meta.env.DEV || import.meta.env.VITE_WAW_GALLERY === "1";

	if (window.location.pathname === "/setup") {
		return <Setup />;
	}
	if (galleryEnabled && hash === "#/gallery/setup") {
		return <Setup initialResult={setupSample} />;
	}
	if (galleryEnabled && hash === "#/gallery") {
		return <Gallery />;
	}
	if (galleryEnabled && hash === "#/gallery/rows") {
		return <Gallery section="rows" />;
	}
	if (galleryEnabled && hash === "#/gallery/controls") {
		return <Gallery section="controls" />;
	}
	if (galleryEnabled && hash === "#/gallery/pickers") {
		return <Gallery section="pickers" />;
	}
	if (galleryEnabled && hash === "#/gallery/navigation") {
		return <Gallery section="navigation" />;
	}
	if (galleryEnabled && hash === "#/gallery/overlays") {
		return <Gallery section="overlays" />;
	}
	if (galleryEnabled && hash === "#/gallery/overlays/quick-add") {
		return <Gallery section="overlays-quick-add" />;
	}
	if (galleryEnabled && hash === "#/gallery/connect") {
		return (
			<ConnectView
				serverUrl="https://tasks.example.com"
				pending={false}
				onSubmit={() => {}}
			/>
		);
	}
	if (galleryEnabled && hash === "#/gallery/update-server") {
		return (
			<UpdateServer
				health={{ apiVersion: 1, capabilities: [] }}
				pending={false}
				onRetry={() => {}}
				onContinue={() => {}}
			/>
		);
	}
	if (galleryEnabled && hash === "#/gallery/shell") {
		return <Shell limited={false} />;
	}
	// The Electron build loads from a file and has no server session until its
	// bridge exists.
	if (window.location.protocol === "file:") {
		return <Shell limited={false} />;
	}
	return <WebApp />;
}
