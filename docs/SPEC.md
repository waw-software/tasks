# WAW Tasks: technical reference

Confirmed product behaviour is in [requirements](requirements.md). This file holds the rest: what the product is, scope, architecture, data model, the details of behaviour that are only proposed, the API and MCP sketches, and the build order. [DESIGN](DESIGN.md) is the source of truth for look.

Every item below is marked one of two ways:

- **Decided**: agreed with the product owner. Do not change without asking.
- **Proposed**: a sensible default that was never explicitly confirmed. You may build on it, but flag it in your PR so it can be confirmed or changed.

## 1. What it is

WAW Tasks is a self-hosted task manager. It sits between Todoist and Google Tasks: Todoist's task model, Google Tasks' simplicity. (Decided)

It is one app in the WAW family (WAW Bot, WAW Notes, WAW Tasks). Each app is a client plus a server that the user deploys on their own machine. (Decided)

Principles (Decided):

- The server belongs to the user. They deploy it, for example on Coolify, and connect clients to it.
- The interface is minimal but not empty: few controls, but every screen says something useful.
- Task behaviour follows Todoist where it matters: projects, sections, subtasks, priorities, labels, filters, recurring tasks, natural-language entry.
- Bots are first-class users. WAW Bot reads and writes tasks through MCP.

## 2. Scope

In scope for v1 (Decided), with the requirements that state each behaviour:

- Tasks with title, description, due date and optional time, priority, labels, reminders, recurrence ([REQ-002](requirements.md), [REQ-003](requirements.md)).
- Subtasks, one level deep. Projects with sections and colours; labels with colours. Tasks without a project live in Inbox ([REQ-002](requirements.md)).
- Views: Today, Upcoming, Inbox, Project, Search ([REQ-004](requirements.md)).
- Quick add with natural-language parsing and inline highlighting ([REQ-005](requirements.md)).
- Saved filters built from simple conditions ([REQ-006](requirements.md)).
- Offline use with later sync; connect by server URL and token, or by scanning a QR code ([REQ-007](requirements.md)).
- MCP endpoint for bots, with its own token ([REQ-009](requirements.md)).
- Clients: iOS app, web client, Electron desktop app ([REQ-001](requirements.md)).

Explicitly out of scope (Decided). Do not build these, even if they seem natural:

- Comments on tasks.
- Board (kanban) view. Projects are lists only.
- Karma, statistics, productivity scores, templates.
- Sharing, collaboration, multiple users on one server.
- A hosted cloud version.

## 3. Architecture

```
iOS app / web client / Electron  --HTTPS-->  reverse proxy
                                                 |
                                                API  --queue-->  Worker
                                                 |                  |
WAW Bot and other bots  --MCP /mcp-->           Postgres  <---------+
```

Decided:

- The server is delivered as a ready Docker image plus a `docker-compose.yml` with two services: the server and Postgres.
- API and Worker live in the same image.
- The Worker handles recurrence and reminders.
- Postgres holds everything. The job queue lives in Postgres too; there is no Redis.
- The web client ships inside the server image and is served by it.
- Bots connect through an MCP endpoint at `/mcp`.

The stack and the layout of the repository are recorded in [the stack decision](decisions/0001-project-stack.md). The workspace holds five apps and one package:

- `apps/core-server`: the API server.
- `apps/core-worker`: the job worker for recurrence and reminders.
- `apps/web`: the web client.
- `apps/mobile`: the iOS app, built with Expo (React Native).
- `apps/desktop`: the Electron app; it has no interface of its own and loads the web client's build.
- `packages/api-contract`: request and response schemas shared by server and clients (`@waw/api-contract`).

Proposed:

- Local store on the client in SQLite (or IndexedDB on web).

### 3.1 Deployment and first run

Decided: the user starts the server with `docker compose up -d`, or deploys the same compose file from Coolify. Updating is `docker compose pull && docker compose up -d`; database migrations run automatically on start. The first-run setup page is described in [REQ-011](requirements.md).

Proposed:

- Minimal configuration: the public URL. Secrets are generated on first start.
- Take a database dump before running migrations.

### 3.2 Versioning between client and server

The client updates through app stores; the server updates when the user chooses. They drift. (Decided) The outcomes are in [REQ-010](requirements.md).

- `GET /health` returns the API version and a list of capabilities, for example `{"apiVersion": 1, "capabilities": ["filters", "reminders"]}`.
- The client turns a feature on when its capability is listed, not by comparing version numbers.
- Within one major API version, change only by adding. Never remove or rename fields.
- Deprecation is soft: warn first, block later.

### 3.3 Auth

Proposed:

- One user per server.
- Each client device holds its own access token. Tokens can be revoked individually.
- Bots use a separate token type, created in Settings under "WAW Bot access". (The separate bot token is Decided; its format is Proposed.)

## 4. Data model

Tables (the set is Decided; column names are Proposed):

| Table | Holds |
| --- | --- |
| `projects` | id, name, color, parent_id, position, pinned, archived_at |
| `sections` | id, project_id, name, position |
| `tasks` | id, title, description, project_id (null means Inbox), section_id, parent_id (subtask), priority (1 to 4), due_date, due_time, recurrence, position, completed_at, created_by |
| `labels` | id, name, color |
| `task_labels` | task_id, label_id |
| `reminders` | id, task_id, kind (at time, minutes before, days before, absolute), value |
| `filters` | id, name, conditions (JSON) |
| `changes` | sequence, entity, entity_id, operation, payload, created_at. The log clients sync from |

Every synced row also needs `updated_at` and a soft-delete marker. (Proposed)

`created_by` records who made the task: the user or a named bot. The Inbox design shows "Added by Accountant in WAW Bot". (Decided that this is shown; the column is Proposed.)

## 5. Behaviour details

The confirmed behaviour is in [requirements](requirements.md). What remains here is proposed.

### 5.1 Tasks

Proposed:

- Store recurrence as an RRULE subset: daily, weekly on given weekdays, monthly on a day, yearly, every N.
- Completed tasks stay searchable and appear in a "Completed" group.

### 5.2 Quick add

Proposed: the key combination of the desktop global shortcut.

### 5.3 Offline and sync

Proposed:

- The client keeps a full local copy and a queue of outgoing operations.
- The server assigns each change a sequence number. A client asks for everything after the last sequence it has seen.
- Conflicts resolve per field, last write wins.

### 5.4 Reminders

Proposed: in v1 the client schedules local notifications from the synced reminders, so no push service is needed. Server-sent push through a relay can come later.

## 6. API sketch (Proposed)

REST, JSON, token in the `Authorization` header.

- `GET /health`
- `GET /sync?after=<sequence>` and `POST /sync` (batch of client operations)
- `GET|POST /tasks`, `GET|PATCH|DELETE /tasks/:id`, `POST /tasks/:id/complete`
- `GET|POST /projects`, `PATCH|DELETE /projects/:id`
- `GET|POST /sections`, `PATCH|DELETE /sections/:id`
- `GET|POST /labels`, `PATCH|DELETE /labels/:id`
- `GET|POST /filters`, `PATCH|DELETE /filters/:id`, `GET /filters/:id/tasks`
- `POST /parse` returns the structured result of a quick-add string, so every client parses the same way
- `POST /tokens` creates a device or bot token

Request and response schemas live in `packages/api-contract` (the `@waw/api-contract` package) and are imported on both sides.

## 7. MCP tools (Proposed names)

`list_tasks`, `get_task`, `create_task`, `update_task`, `complete_task`, `list_projects`, `list_labels`, `list_filters`, `run_filter`.

`create_task` accepts either structured fields or a quick-add string. Tasks created through MCP record the bot's name in `created_by`.

## 8. Build order (Proposed)

Work in vertical slices. Each slice includes the API, the screen and a test.

1. Design tokens and base components (see [DESIGN](DESIGN.md)).
2. Server skeleton: `/health`, auth, migrations, Docker image and compose file.
3. Connect flow: URL and token, connection check, QR pairing.
4. Today list, read only, then complete a task.
5. Quick add with parsing and highlighting.
6. Task detail: fields, subtasks, date, repeat, reminders, priority, labels.
7. Projects, sections, Inbox, Browse and the desktop sidebar.
8. Upcoming.
9. Search and filters.
10. Offline queue and sync, then the offline and old-server states.
11. MCP endpoint and bot token.
12. Electron shell: tray, launch at login, global shortcut.

## 9. Open questions

- Reminders: local notifications only in v1, or a push relay from the start?
- Should the web client need the token on every visit, or keep a session?
- How are deleted projects handled: delete their tasks or move them to Inbox?

The tech stack is settled in [the stack decision](decisions/0001-project-stack.md).
