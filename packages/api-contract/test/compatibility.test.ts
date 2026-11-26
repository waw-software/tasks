import { describe, expect, it } from "vitest";
import {
	CAPABILITY_LABELS,
	capabilitiesFromHealth,
	capabilityKey,
	evaluateServerCompatibility,
	KNOWN_CAPABILITIES,
	missingCapabilities,
	needsServerUpdate,
	reconcileLimitedAck,
} from "../src/compatibility.js";

describe("client compatibility policy", () => {
	it("REQ-010 AC-34 uses exact membership at equal versions", () => {
		const server = capabilitiesFromHealth({
			apiVersion: 1,
			capabilities: ["connect", "x"],
		});
		expect(server.hasCapability("connect")).toBe(true);
		expect(server.hasCapability("Connect")).toBe(false);
		expect(server.hasCapability("today")).toBe(false);

		const bare = capabilitiesFromHealth({ apiVersion: 1, capabilities: [] });
		expect(bare.hasCapability("connect")).toBe(false);
		expect(bare.hasCapability("")).toBe(false);
	});

	it.each([
		{ capabilities: [], needsUpdate: true, missing: ["connect"] },
		{ capabilities: ["connect"], needsUpdate: false, missing: [] },
		{ capabilities: ["future-x"], needsUpdate: true, missing: ["connect"] },
	])(
		"REQ-010 AC-35 a server without a known capability needs an update: $capabilities",
		({ capabilities, needsUpdate, missing }) => {
			const health = { apiVersion: 1, capabilities };
			expect(needsServerUpdate(health)).toBe(needsUpdate);
			expect(missingCapabilities(health)).toEqual(missing);
		},
	);

	it("REQ-010 AC-35 triggers on a lower API version", () => {
		expect(
			evaluateServerCompatibility(
				{ apiVersion: 1, capabilities: ["connect"] },
				2,
			),
		).toBe(true);
		expect(
			evaluateServerCompatibility(
				{ apiVersion: 2, capabilities: ["connect"] },
				1,
			),
		).toBe(false);
	});

	it("REQ-010 AC-35 remembers limited mode until the capability set changes", () => {
		expect(
			capabilityKey({ apiVersion: 1, capabilities: ["b", "a", "a"] }),
		).toBe('["a","b"]');
		expect(capabilityKey({ apiVersion: 1, capabilities: ["a", "b"] })).toBe(
			'["a","b"]',
		);

		const origin = "https://tasks.example.com";
		const ack = { serverUrl: origin, capabilityKey: '["a","b"]' };
		const ignored = { accepted: false, clear: false };
		const kept = { accepted: true, clear: false };
		const stale = { accepted: false, clear: true };
		const table = [
			{
				name: "no record",
				ack: null,
				url: origin,
				version: 1,
				list: ["a", "b"],
				want: ignored,
			},
			{
				name: "other origin, same set",
				ack,
				url: "https://other.example.com",
				version: 1,
				list: ["a", "b"],
				want: ignored,
			},
			{
				name: "other origin, changed set",
				ack,
				url: "https://other.example.com",
				version: 1,
				list: ["a"],
				want: ignored,
			},
			{
				name: "same set",
				ack,
				url: origin,
				version: 1,
				list: ["a", "b"],
				want: kept,
			},
			{
				name: "reordered set",
				ack,
				url: origin,
				version: 1,
				list: ["b", "a", "b"],
				want: kept,
			},
			{
				name: "added capability",
				ack,
				url: origin,
				version: 1,
				list: ["a", "b", "c"],
				want: stale,
			},
			{
				name: "removed capability",
				ack,
				url: origin,
				version: 1,
				list: ["a"],
				want: stale,
			},
			{
				name: "compatible but changed set",
				ack,
				url: origin,
				version: 1,
				list: ["connect"],
				want: stale,
			},
			{
				name: "API version only",
				ack,
				url: origin,
				version: 2,
				list: ["a", "b"],
				want: kept,
			},
		];
		for (const row of table) {
			const health = { apiVersion: row.version, capabilities: row.list };
			expect(reconcileLimitedAck(row.ack, row.url, health), row.name).toEqual(
				row.want,
			);
		}
	});

	it("labels every known capability", () => {
		expect(KNOWN_CAPABILITIES.length).toBeGreaterThan(0);
		for (const name of KNOWN_CAPABILITIES) {
			expect(CAPABILITY_LABELS[name], name).toMatch(/\S/);
		}
	});
});
