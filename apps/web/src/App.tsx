import type { SetupClaimResponse } from "@waw/api-contract";
import { useEffect, useState } from "react";
import Gallery from "./Gallery.tsx";
import { Setup } from "./Setup.tsx";

// Synthetic values for the visual check; the image is a one-pixel placeholder.
const setupSample: SetupClaimResponse = {
	serverUrl: "https://tasks.example.com",
	accessToken: `waw_dev_${"A".repeat(43)}`,
	pairingLink: `https://tasks.example.com/pair#token=waw_pair_${"B".repeat(43)}`,
	qrDataUrl:
		"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
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
	return (
		<main>
			<h1>WAW Tasks</h1>
		</main>
	);
}
