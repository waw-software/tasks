import { describe, expect, it } from "vitest";
import { resolveWebTarget } from "./web-target";

describe("resolveWebTarget", () => {
	it("REQ-001 AC-05: loads the web dev server in development", () => {
		expect(
			resolveWebTarget({
				isDev: true,
				devUrl: undefined,
				appPath: "/x/apps/desktop",
			}),
		).toEqual({ kind: "url", url: "http://localhost:5173" });
	});

	it("REQ-001 AC-05: uses WAW_WEB_URL in development when set", () => {
		expect(
			resolveWebTarget({
				isDev: true,
				devUrl: "http://127.0.0.1:6000",
				appPath: "/x/apps/desktop",
			}),
		).toEqual({ kind: "url", url: "http://127.0.0.1:6000" });
	});

	it("REQ-001 AC-05: loads the web build from disk outside development", () => {
		expect(
			resolveWebTarget({
				isDev: false,
				devUrl: "http://ignored",
				appPath: "/x/apps/desktop",
			}),
		).toEqual({ kind: "file", path: "/x/apps/web/dist/index.html" });
	});
});
