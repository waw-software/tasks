import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { freePort } from "./server.ts";

const root = fileURLToPath(new URL("../../../..", import.meta.url));
const composeFile = fileURLToPath(
	new URL("../../../../docker-compose.yml", import.meta.url),
);

/** Runs `docker <args>` (no shell), returns stdout; rejects with stderr on a non-zero exit; timeoutMs default 600_000. */
export function docker(
	args: readonly string[],
	options: { env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<string> {
	const { env = process.env, timeoutMs = 600_000 } = options;
	return new Promise((resolve, reject) => {
		execFile(
			"docker",
			[...args],
			// A build writes its whole progress to stderr.
			{ cwd: root, env, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 },
			(error, stdout, stderr) => {
				if (!error) {
					resolve(stdout);
					return;
				}
				// Only stderr goes into the message: stdout can hold a credential.
				const reason = error.killed
					? `was stopped after ${timeoutMs} ms`
					: `failed (${error.code})`;
				reject(new Error(`docker ${args.join(" ")} ${reason}:\n${stderr}`));
			},
		);
	});
}

/** `docker image rm -f <reference>`; an image that does not exist is not an error. */
export async function removeImage(reference: string): Promise<void> {
	try {
		await docker(["image", "rm", "--force", reference]);
	} catch (error) {
		// Some Docker versions fail for a missing image even with --force.
		if (!/no such image/i.test(String(error))) {
			throw error;
		}
	}
}

/** Polls GET `url` until it answers 200; rejects after timeoutMs. */
export async function waitForOk(url: string, timeoutMs: number): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	let last = "no answer";
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
			await response.body?.cancel();
			if (response.status === 200) {
				return;
			}
			last = `status ${response.status}`;
		} catch (error) {
			// Refused and reset connections are expected until the service is up.
			last = String(error);
		}
		await delay(500);
	}
	throw new Error(`${url} did not answer 200 within ${timeoutMs} ms: ${last}`);
}

export interface ComposeProject {
	name: string;
	env: NodeJS.ProcessEnv;
	port: number;
	/** The server image tag of this project alone, in WAW_SERVER_IMAGE. */
	image: string;
	/** docker compose -f <repo>/docker-compose.yml -p <name> --env-file <empty file> <args> */
	compose(
		args: readonly string[],
		extraEnv?: NodeJS.ProcessEnv,
	): Promise<string>;
	/** Polls GET http://127.0.0.1:<port>/health until 200 (default 120_000), returns the base URL. */
	waitHealthy(timeoutMs?: number): Promise<string>;
}

/**
 * Unique project name waw-e2e-<hex> and server image tag, a free host port in WAW_PORT; in finally
 * always `down -v --remove-orphans`, then the image is removed.
 */
export async function withCompose<T>(
	run: (project: ComposeProject) => Promise<T>,
): Promise<T> {
	const id = randomBytes(6).toString("hex");
	const name = `waw-e2e-${id}`;
	// A deployment on the same engine keeps its own image.
	const image = `localhost/waw-tasks-server:e2e-${id}`;
	const port = await freePort();
	const env: NodeJS.ProcessEnv = {
		...process.env,
		WAW_PORT: String(port),
		WAW_SERVER_IMAGE: image,
	};
	// The specs prove the compose file as delivered: no setting of the caller reaches it,
	// neither from the environment nor from a .env file in the checkout.
	delete env.PUBLIC_URL;
	const envDir = await mkdtemp(join(tmpdir(), "waw-e2e-env-"));
	const envFile = join(envDir, "empty.env");
	await writeFile(envFile, "");

	const project: ComposeProject = {
		name,
		env,
		port,
		image,
		compose: (args, extraEnv) =>
			docker(
				[
					"compose",
					"-f",
					composeFile,
					"-p",
					name,
					"--env-file",
					envFile,
					...args,
				],
				{ env: { ...env, ...extraEnv } },
			),
		async waitHealthy(timeoutMs = 120_000) {
			const baseUrl = `http://127.0.0.1:${port}`;
			await waitForOk(`${baseUrl}/health`, timeoutMs);
			return baseUrl;
		},
	};

	try {
		return await run(project);
	} finally {
		try {
			await project.compose(["down", "-v", "--remove-orphans"]);
		} finally {
			await removeImage(image);
			await rm(envDir, { recursive: true, force: true });
		}
	}
}
