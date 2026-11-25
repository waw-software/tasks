# Project rules

The rules every task in WAW Tasks follows. This file is also the project's review criteria.

## Read first

1. [requirements.md](requirements.md): the confirmed behaviour and acceptance criteria.
2. [SPEC.md](SPEC.md): scope, architecture, data model, proposals and build order.
3. [DESIGN.md](DESIGN.md): tokens, components and the list of screens.
4. [design/README.md](design/README.md): how to read the screen mockups.

Open a screen's mockup and its PNG before building that screen.

## Rules

- [SPEC.md](SPEC.md) marks every item **Decided** or **Proposed**. A Decided item changes only with the owner. You may build on a Proposed item, but list it in the pull request description so it can be confirmed.
- Anything the documents do not cover is an open question for the owner. Never pick a default silently.
- Never build what the [out-of-scope list](SPEC.md#2-scope) names. In particular: no comments on tasks, no board view.
- Take colours, type and sizes from the tokens in [DESIGN.md](DESIGN.md). Do not hard-code values and do not add colours.
- The mockups are a visual reference. Do not copy their HTML or inline styles into the app.
- Where a mockup disagrees with the documents, the documents win; known gaps are listed in [DESIGN.md](DESIGN.md).
- UI copy is in English. Use the wording from the mockups.
- Contract first: change `packages/api-contract` (`@waw/api-contract`), then the server and the clients.
- API changes within a major version only add. Clients turn features on by the capabilities of `GET /health`.

## How to work

- Follow the build order in [SPEC.md](SPEC.md#8-build-order-proposed): one vertical slice per pull request, with API, screen and tests together.
- Build tokens and base components first, so every later screen uses them.
- Run each product slice end to end against a real server, from the compose file once it exists.
- After each UI slice, run the visual check (see [Done](#done)) on every screen the slice changed.

## Done

A pull request that changes UI is done only when the visual check was run and its result is in the pull request:

- Capture every changed screen with `pnpm --filter @waw/e2e visual --out out/visual/<run> --screen <id>`: web at 390 and 1440 px, the desktop window, and the iOS simulator. Each id is a screen and a surface, such as `shell.web-390`; new screens are added to the screen manifest of `packages/e2e` with their mockup PNG from `docs/design/screens/`.
- The command writes `<id>.actual.png` and, when the screen has a mockup, `<id>.mockup.png` next to it. Compare each pair and list the differences left in the pull request.
- A capture that could not run (for example `SKIP shell.ios: simctl unavailable` on a Mac without Xcode) and a screen without a mockup are listed in the pull request as not covered.

## Tests

General rules: [testing rules](../.claude/rules/testing.md).

| Level | Tools |
| --- | --- |
| Static | Biome (format, lint) and `tsc --noEmit` |
| Unit | Vitest for server, worker, web and desktop; jest-expo with React Native Testing Library for mobile |
| End to end | Playwright against the built server and web client (`scripts/env.sh e2e`, and the `e2e` workflow on every pull request); the visual check uses Playwright for web and desktop and `simctl` for iOS |

Tests cover these edge cases of the domain:

- Time zones and day boundaries for due dates, Today and Upcoming.
- Recurrence: month ends, leap years, completing a recurring task.
- Reminders relative to a task without a time.
- Offline queue replay and retries, including duplicates.
- Per-field last-write-wins conflicts.
- An old server with capabilities missing.

## Commands

- `pnpm install --frozen-lockfile`
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`
- `pnpm test:unit`, `pnpm build`
- `pnpm --filter @waw/<app> dev` for one app
- `scripts/check.sh` is the full check; `scripts/env.sh setup|fast|reset` sets up, runs the fast check, or resets.
- `scripts/env.sh e2e` runs the end-to-end specs; once per machine, first `pnpm --filter @waw/e2e exec playwright install chromium`.
- `pnpm --filter @waw/e2e visual --out out/visual/<run> [--screen <id>]...` runs the visual check; with no `--screen` it captures every screen. iOS is captured one screen per run: when more than one iOS screen is selected (also with no `--screen`), each prints a `SKIP` line. The desktop capture needs `pnpm --filter @waw/desktop exec install-electron` once; iOS needs Xcode, a booted simulator showing the screen, and `--ios-device <UDID>` (from `xcrun simctl list devices booted`).
