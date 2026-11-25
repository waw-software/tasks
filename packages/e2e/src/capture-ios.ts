import { spawnSync } from "node:child_process";

export function captureIos(
	device: string | undefined,
	destination: string,
): "captured" | "unavailable" {
	if (process.platform !== "darwin") return "unavailable";
	if (
		spawnSync("xcrun", ["--find", "simctl"], { stdio: "ignore" }).status !== 0
	)
		return "unavailable";
	if (device === undefined) {
		throw new Error(
			"--ios-device <UDID> is required for iOS screens; find it with xcrun simctl list devices booted",
		);
	}
	const result = spawnSync(
		"xcrun",
		["simctl", "io", device, "screenshot", destination],
		{
			encoding: "utf8",
		},
	);
	if (result.status !== 0) {
		throw new Error(
			`simctl screenshot failed: ${result.stderr?.trim() || result.error?.message || "no output"}`,
		);
	}
	return "captured";
}
