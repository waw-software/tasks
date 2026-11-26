import { describe, expect, it } from "vitest";
import {
	decodeDeviceCredential,
	decodeDeviceIdentity,
	decodeHealth,
} from "../src/client-values.js";

const ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c";
const TOKEN = "waw_dev_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL01_-9";

describe("v1 client decoders", () => {
	it("REQ-010 AC-36 accepts additive v1 fields", () => {
		expect(
			decodeHealth({
				apiVersion: 1,
				capabilities: ["connect"],
				serverName: "x",
			}),
		).toStrictEqual({ apiVersion: 1, capabilities: ["connect"] });
		expect(decodeDeviceIdentity({ id: ID, label: "phone" })).toStrictEqual({
			id: ID,
		});
		expect(
			decodeDeviceCredential({ id: ID, token: TOKEN, label: "phone" }),
		).toStrictEqual({ id: ID, token: TOKEN });
	});

	it.each([
		["apiVersion 0", { apiVersion: 0, capabilities: [] }],
		["a fractional apiVersion", { apiVersion: 1.5, capabilities: [] }],
		["a string apiVersion", { apiVersion: "1", capabilities: [] }],
		["a missing apiVersion", { capabilities: [] }],
		["missing capabilities", { apiVersion: 1 }],
		[
			"capabilities that are not an array",
			{ apiVersion: 1, capabilities: "connect" },
		],
		[
			"a number among the capabilities",
			{ apiVersion: 1, capabilities: ["connect", 2] },
		],
		["null", null],
		["an array", []],
		["a string", "x"],
	])(
		"REQ-010 AC-36 rejects malformed required fields: health with %s",
		(_, value) => {
			expect(decodeHealth(value)).toBeNull();
		},
	);

	it.each([
		["an id that is not a UUID", { id: "device-1" }],
		["a urn:uuid id", { id: `urn:uuid:${ID}` }],
		["a missing id", {}],
		["an id that is not a string", { id: [ID] }],
		["null", null],
		["an array", []],
		["a string", "x"],
	])(
		"REQ-010 AC-36 rejects malformed required fields: identity with %s",
		(_, value) => {
			expect(decodeDeviceIdentity(value)).toBeNull();
		},
	);

	it.each([
		["an id that is not a UUID", { id: "device-1", token: TOKEN }],
		["a missing id", { token: TOKEN }],
		["a missing token", { id: ID }],
		["a token that is not a string", { id: ID, token: [TOKEN] }],
		[
			"a token with another prefix",
			{
				id: ID,
				token: "waw_pair_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL01_-9",
			},
		],
		[
			"a token one character short",
			{
				id: ID,
				token: "waw_dev_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL01_-",
			},
		],
		[
			"a token one character long",
			{
				id: ID,
				token: "waw_dev_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKL01_-9a",
			},
		],
		["null", null],
		["an array", []],
		["a string", "x"],
	])(
		"REQ-010 AC-36 rejects malformed required fields: credential with %s",
		(_, value) => {
			expect(decodeDeviceCredential(value)).toBeNull();
		},
	);

	it("REQ-010 AC-34 keeps an unknown server capability", () => {
		expect(
			decodeHealth({ apiVersion: 1, capabilities: ["future-x"] }),
		).toStrictEqual({ apiVersion: 1, capabilities: ["future-x"] });
	});
});
