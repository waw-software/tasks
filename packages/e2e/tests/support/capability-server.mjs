// Test-only entry: the built server with the capability list in WAW_E2E_CAPABILITIES
// (a JSON array of strings). It is part of neither the server build nor the Docker image.
import { startServer } from "../../../../apps/core-server/dist/start.js";

function parseCapabilities(value) {
	try {
		const list = JSON.parse(value ?? "");
		if (Array.isArray(list) && list.every((item) => typeof item === "string")) {
			return list;
		}
	} catch {
		// Not JSON: rejected like any other wrong value.
	}
	return undefined;
}

const capabilities = parseCapabilities(process.env.WAW_E2E_CAPABILITIES);
if (capabilities) {
	await startServer({ capabilities });
} else {
	process.stderr.write(
		"WAW_E2E_CAPABILITIES must be a JSON array of strings\n",
	);
	process.exitCode = 1;
}
