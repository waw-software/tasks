# Requirements

Confirmed product behaviour. The list of features that are out of scope lives in [SPEC](SPEC.md#2-scope); behaviour details and proposals are in [SPEC](SPEC.md).

REQ-001: The platform foundation exists: a server with a health endpoint, a worker, and web, iOS and desktop clients that each start and show the app.
AC-01: Given the server is running, when a client calls `GET /health`, then it answers 200 with `apiVersion` 1 and the list of capabilities the server supports.
AC-02: Given the worker starts, when the job queue has started and every job handler is registered, then the worker reports ready; when the queue fails to start, then it reports the failure and does not report ready.
AC-03: Given the web client is opened, then it shows the WAW Tasks app shell with a "WAW Tasks" heading.
AC-04: Given the iOS app is opened, then it shows the WAW Tasks app shell with a "WAW Tasks" heading.
AC-05: Given the desktop app starts, then its window shows the web client.

REQ-002: A user organises tasks with projects, sections, subtasks, priorities, labels and colours.
AC-06: Given a task is created without a project, when the user opens Inbox, then the task is listed there.
AC-07: Given a project has sections, when the user opens the project, then tasks appear under their sections, tasks without a section appear in a "No section" group, and "Add section" is offered.
AC-08: Given a task has subtasks, when the task is shown in a list, then the parent shows progress such as "1 of 3".
AC-09: Given a task is a subtask, when the user tries to add a subtask to it, then the app does not allow a second level of nesting.
AC-10: Given a task has priority P4, when it is shown in a list, then no priority marker is shown; given it has P1 to P3, then the marker is shown.
AC-11: Given a task has a due date, when the user sets or clears a time, then the date stays and the task shows the time only when one is set.
AC-12: Given tasks exist in Inbox, when the user chooses Move on a task, then the task moves to the chosen project.

REQ-003: A user schedules tasks with due dates, recurrence and reminders.
AC-13: Given a recurring task, when the user completes it, then the next occurrence is created and the task detail shows when it is.
AC-14: Given a task, when the user adds several reminders (at the time of the task, minutes before, a day before, or at a specific time), then every reminder is kept on the task.

REQ-004: A user works through the Today, Upcoming, Inbox, Project and Search views, and Browse on mobile or the sidebar on desktop.
AC-15: Given overdue and due-today tasks exist, when the user opens Today, then an "Overdue" group comes first, then today's tasks, with P1 tasks at the top, and a progress bar shows done versus total.
AC-16: Given every task due today is done, when the user opens Today, then the screen says so and previews tomorrow.
AC-17: Given tasks with future due dates exist, when the user opens Upcoming, then tasks are grouped by day and an empty day says "Nothing planned".
AC-18: Given the user is on a phone, when they open Upcoming, then a week strip is shown on top; given the user is on desktop, then the week is shown as seven columns.
AC-19: Given tasks exist, when the user searches by text and condition chips, then only matching tasks are listed, and the user can save the search as a filter.
AC-20: Given projects, labels and filters exist, when the user opens Browse (mobile) or the sidebar (desktop), then Inbox, projects with colours and counts, labels, filters and the server status are shown.

REQ-005: A user adds a task by typing one sentence in quick add.
AC-21: Given the quick add field, when the user types "Pay rent every 1st at 9:00 p1 #Home @money", then the date and recurrence, time, priority, project and label are recognised.
AC-22: Given the user is typing in quick add, then each recognised part is highlighted inline in its own style: date neutral, priority in the priority colour, project with its colour marker, label in the label's colour.
AC-23: Given quick add has recognised parts, then "Understood as" shows the result as chips below the field before the task is saved.
AC-24: Given quick add, when the user uses the buttons beside the field, then date, priority, label and reminder can be set by hand.
AC-25: Given the desktop app is running, when the user presses the global shortcut from any app, then quick add opens as a dialog.

REQ-006: A user filters tasks with saved filters built from simple conditions.
AC-26: Given the filter editor, when the user picks conditions from the lists (project, due, priority, label, text), then the editor shows how many tasks match now.
AC-27: Given a saved filter, when a bot lists filters or fetches a filter's tasks by name, then it receives the filter and its matching tasks.

REQ-007: A user connects a client to their server and keeps working offline.
AC-28: Given a client, when the user enters a server URL and token, or scans a QR code, then the client connects to that server.
AC-29: Given the server is not reachable, when the user changes tasks, then the changes are saved locally and marked "not synced yet".
AC-30: Given changes are waiting to sync, then a banner shows how many are waiting and offers Retry, and Settings shows the sync state and the count of waiting changes.

REQ-008: A user is reminded of tasks without a push service.
AC-31: Given a task has a reminder, when the reminder time comes, then the user is notified.

REQ-009: Bots read and write tasks through MCP with their own token.
AC-32: Given a bot token created in Settings under "WAW Bot access", when a bot calls the MCP endpoint at `/mcp` with it, then the bot can read and write tasks.
AC-33: Given a task was created by a bot, when the task is shown, then it names the bot as the one who added it.

REQ-010: Client and server stay compatible while they update independently.
AC-34: Given a server that lists a capability in `GET /health`, when a client runs, then the client turns the feature on by that capability, not by comparing version numbers.
AC-35: Given a server that is too old, when the client connects, then it shows the "server needs an update" screen and lets the user continue with limited features.
AC-36: Given an API change within one major version, then it only adds and never removes or renames fields.

REQ-011: A user deploys and updates the server on their own machine.
AC-37: Given the delivered compose file, when the user runs `docker compose up -d`, then the server and Postgres start.
AC-38: Given a new version, when the user runs `docker compose pull && docker compose up -d`, then the server updates and database migrations run automatically on start.
AC-39: Given the server starts for the first time, when the user opens it, then a setup page shows the server address, an access token, a pairing link and a QR code that carries the address and a one-time token.
