---
status: accepted
date: 2026-11-22
decision-makers: oleksandrv (owner)
scope: stack
summary: "In the context of a self-hosted task manager with a server and iOS, web and desktop clients, facing the need for one language and one workspace, we decided Fastify 5 with Drizzle ORM and pg-boss on Postgres, React with Vite for web, Expo for mobile and electron-vite for desktop in a pnpm workspace, and rejected NestJS with Prisma, Kysely with Graphile Worker, React Native Web and bare React Native, to achieve one TypeScript codebase with a small server and no Redis, accepting that web and mobile do not share UI code."
supersedes: []
---

# WAW Tasks runs on Node and TypeScript: Fastify, Postgres, React, Expo and Electron in one pnpm workspace

## Context and Problem Statement

WAW Tasks is a self-hosted task manager: a server the user deploys with Docker, and iOS, web and
desktop clients ([SPEC](../SPEC.md#3-architecture)). The server needs an API, a job queue for
recurrence and reminders, and Postgres as the only store, with no Redis. The stack is costly to
change once code exists, so the owner chose it before the first slice.

## Considered Options

* Fastify 5 + Drizzle ORM/pg + pg-boss; React + Vite web, Expo mobile, electron-vite desktop loading the web build; pnpm workspace, Node 24, TypeScript
* NestJS + Prisma + Graphile Worker
* Fastify + Kysely + Graphile Worker
* React Native Web for the web client (one codebase for iOS and web)
* Bare React Native for mobile

## Decision Outcome

Chosen option: "Fastify 5 + Drizzle ORM/pg + pg-boss; React + Vite web, Expo mobile, electron-vite
desktop loading the web build; pnpm workspace, Node 24, TypeScript", because it keeps one language
across server and clients, a small server with schema-based routes, a queue inside Postgres, and
the best tool for each client. The workspace layout is in [SPEC](../SPEC.md#3-architecture); exact
versions are pinned in the manifests.

Tooling is part of the decision: Biome for format and lint, `tsc --noEmit` for types, Vitest for
server, worker, web and desktop tests, jest-expo with React Native Testing Library for mobile. The
shared contract in `packages/api-contract` is written with TypeBox, so schemas validate at runtime
and give types.

Rejected: NestJS with Prisma and Graphile Worker, as more framework and tooling than a small
server needs; Fastify with Kysely and Graphile Worker, as Drizzle and pg-boss were preferred by the
owner; React Native Web for web, because the web client is plain React DOM on Vite and does not
inherit mobile constraints; bare React Native, because Expo covers the native needs with less setup.

### Consequences

* Good, because one language and one workspace cover server, worker and all clients.
* Good, because the queue lives in Postgres, so deployment is two services.
* Bad, because web and mobile have separate UI code, so screens are built twice.
* Bad, because Metro, Electron packaging and a shared lockfile can conflict and need care.

### Confirmation

`scripts/check.sh` runs lint, types and tests over the workspace; the manifests of the apps and
packages pin the stack.
