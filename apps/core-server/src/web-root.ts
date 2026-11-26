import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute WEB_ROOT when set (must be absolute), else <repo>/apps/web/dist resolved from this module's URL (valid from src/ and dist/). Throws Error("web client build not found: <dir>/index.html") when index.html is missing. */
export function resolveWebRoot(env: NodeJS.ProcessEnv): string {
	const configured = env.WEB_ROOT;
	if (configured && !isAbsolute(configured)) {
		throw new Error("WEB_ROOT must be an absolute path");
	}
	const webRoot =
		configured || fileURLToPath(new URL("../../web/dist", import.meta.url));
	const index = join(webRoot, "index.html");
	if (!existsSync(index)) {
		throw new Error(`web client build not found: ${index}`);
	}
	return webRoot;
}
