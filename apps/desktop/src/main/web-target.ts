import { join } from "node:path";

export type WebTarget =
	| { kind: "url"; url: string }
	| { kind: "file"; path: string };

export const DEFAULT_WEB_DEV_URL = "http://localhost:5173";

export function resolveWebTarget(opts: {
	isDev: boolean;
	devUrl: string | undefined;
	appPath: string;
}): WebTarget {
	if (opts.isDev) {
		return { kind: "url", url: opts.devUrl ?? DEFAULT_WEB_DEV_URL };
	}
	return {
		kind: "file",
		path: join(opts.appPath, "..", "web", "dist", "index.html"),
	};
}
