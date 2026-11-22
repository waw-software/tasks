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
- After each UI slice, compare the screen with its mockup PNG at 390 px (mobile) and 1440 px (desktop), and list the differences left in the pull request.

## Tests

General rules: [testing rules](../.claude/rules/testing.md).

| Level | Tools |
| --- | --- |
| Static | Biome (format, lint) and `tsc --noEmit` |
| Unit | Vitest for server, worker, web and desktop; jest-expo with React Native Testing Library for mobile |
| End to end | Not yet; Playwright is planned |

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
