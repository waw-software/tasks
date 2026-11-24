# WAW Tasks: design reference

This file is the source of truth for how the app looks. [SPEC.md](SPEC.md) is the source of truth for how it behaves.

The screens were drawn as HTML mockups. Their sources are in [design/mobile/](design/mobile/) and [design/desktop/](design/desktop/). PNG exports are in [design/screens/](design/screens/), named after their source. How to read the sources is explained in [design/README.md](design/README.md).

Use the mockups for layout, spacing, colour, copy and states. Do not copy their markup: they are inline-styled HTML with sample data, not components.

## 1. Character

- Minimal but not empty. White background, one accent colour, few borders. Every screen still tells the user something: a count, a progress bar, a next step.
- Colour carries meaning, never decoration: red accent for the primary action, project colours for projects, label colours for labels, priority colours for priority.
- All UI copy is in English.

## 2. Tokens

Put these in one theme module and use only the names in components.

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#FFFFFF` | Screen background |
| `surface` | `#F6F5F2` | Sidebar, cards, input fill, grouped rows |
| `ink` | `#171717` | Primary text |
| `ink-2` | `#3D3D3D` | Secondary text in body copy |
| `muted` | `#5C5C5C` | Meta text, counts, inactive tabs |
| `border` | `#E4E2DD` | Default borders |
| `border-strong` | `#D9D6D0` | Input borders, unselected options |
| `divider` | `#EEECE8` | Row dividers |
| `accent` | `#D4213D` | Primary button, FAB, active tab, logo |
| `accent-text` | `#B01A31` | Accent used as text or links on white |
| `accent-dark` | `#8C1427` | Hover and pressed |
| `accent-tint` | `#FCEBEE` | Selected row, accent chip background |
| `success` | `#1F7A4D` | Connected, done |
| `success-text` | `#1B6943` | Success text on tint |
| `success-tint` | `#EEF6F1` | Success banner background |
| `warning` | `#8A5A00` | Offline, waiting to sync. Use `#7A4F00` on `surface` |
| `warning-tint` | `#FBF3E2` | Warning banner background |

Text colours were chosen for contrast against their backgrounds. Keep the pairs together: do not put `accent` text on `surface`, use `accent-text`.

### Priority

| Priority | Ink | Shown as |
| --- | --- | --- |
| P1 | `#B01A31` | "P1" in bold before the meta text |
| P2 | `#8A5A00` | same |
| P3 | `#1F5FBF` | same |
| P4 | `#5C5C5C` | Not shown in lists |

### Project colours

Red `#D4213D`, Blue `#1F5FBF`, Green `#1F7A4D`, Amber `#8A5A00`, Violet `#5B3FB5`, Black `#171717`.

A project is marked by a small rounded square (8 px, radius 3) in its colour, next to its name.

### Label colours

A label is a chip: background tint plus ink of the same hue. The label palette reuses the project hues.

| Hue | Chip background | Chip ink | Background on `surface` |
| --- | --- | --- | --- |
| Green | `#EEF6F1` | `#1B6943` | `#E2F0E8` |
| Blue | `#EAF1FB` | `#1F5FBF` | `#DCE8F8` |
| Amber | `#FBF3E2` | `#8A5A00` | `#F6E9CC` with ink `#7A4F00` |
| Violet | `#F0ECFA` | `#5B3FB5` | `#E6DFF7` |

Sample labels in the mockups: `@money` green, `@calls` blue, `@waiting` amber, `@errands` violet.

### Type

- Body: Inter 400, 500, 600.
- Headings and the wordmark: Space Grotesk 500, 600.
- Code, tokens, URLs: the system monospace stack.

| Role | Size | Notes |
| --- | --- | --- |
| Screen title | 30 px | Space Grotesk 600 |
| Section and panel titles | 22 to 26 px | Space Grotesk 600 |
| Body, task title | 15 to 16 px | Inter 400 or 500 |
| Meta | 13 px | `muted` |
| Group label | 12 px | Uppercase, letter spacing 0.4 px, 600 |
| Tab label | 11 px | |

### Shape and size

- Radius: 6 for chips, 10 for nav rows, 12 for inputs and buttons, 14 for cards and primary buttons, 16 to 18 for sheets and dialogs, 999 for pills.
- Every tappable target is at least 44 px high.
- Mobile: inputs 50 to 52 px, primary button 54 px, floating add button 56 px, tab item 52 px. Reference frame 390 x 844.
- Desktop: sidebar 248 px, detail panel 340 to 440 px, main area padding 32 x 36 px. Reference width 1440.

## 3. Components

Build these first; every screen is made from them.

- **Task row.** Checkbox, title, then one meta line. The meta line holds, in order: priority and time or recurrence text, label chips, and on the right the project name with its colour square. The line wraps when it does not fit. A row with unsynced changes shows "not synced yet" in the warning colour.
- **Checkbox.** 22 px box inside a 44 px hit area. Checked is filled `ink` with a white tick; the title is struck through and `muted`. The mockups use the native checkbox; a custom one must keep these sizes and colours.
- **Label chip.** Padding 2 x 8, radius 6, 13 px, weight 500.
- **Project marker.** 8 px square, radius 3.
- **Group header.** Uppercase 12 px label with an optional count, for example "OVERDUE 1".
- **Progress bar.** 6 px bar under the Today title, `ink` fill on a `divider` track, with "2 of 7 done" beside it.
- **Banner.** Full-width strip in a tint with an action on the right. Used for offline, update available, connection result.
- **Primary button, secondary button, text button.**
- **Text input** with label above, helper text below, and an error state.
- **Segmented choice and option list** for pickers (priority, repeat, reminder).
- **Colour swatch picker** for projects and labels.
- **Tab bar** (mobile): Today, Upcoming, Search, Browse, with the add button floating above it.
- **Sidebar** (desktop): wordmark, views with counts, projects, labels, filters, server status at the bottom.
- **Detail panel** (desktop): right column that shows a task, a project editor or a filter editor.
- **Dialog** (desktop quick add) and **sheet** (mobile quick add and pickers).

## 4. Quick add highlighting

While the user types, recognised parts of the text are highlighted in place:

- Date, time and recurrence: neutral `surface` background.
- Priority: `accent-dark` text on `accent-tint` for P1; the other priorities use their ink on the matching tint.
- `#Project`: the project's colour square plus the name on `surface`.
- `@label`: the label's own chip colours.

Under the field an "Understood as" row repeats the result as chips. Both the inline highlights and the chips must update on every keystroke.

## 5. Screens

### Mobile ([design/mobile/](design/mobile/))

| File | Preview | Screen | Notes |
| --- | --- | --- | --- |
| [`Main.dc.html`](design/mobile/Main.dc.html) | [Main.png](design/screens/mobile/Main.png) | Today | Overdue group, today's tasks, progress bar, tab bar, add button |
| [`EmptyToday.dc.html`](design/mobile/EmptyToday.dc.html) | [EmptyToday.png](design/screens/mobile/EmptyToday.png) | Today, all done | Success message and a preview of tomorrow |
| [`QuickAdd.dc.html`](design/mobile/QuickAdd.dc.html) | [QuickAdd.png](design/screens/mobile/QuickAdd.png) | Quick add sheet | Inline highlights, "Understood as" chips, manual buttons |
| [`Task.dc.html`](design/mobile/Task.dc.html) | [Task.png](design/screens/mobile/Task.png) | Task detail | Fields, subtasks with progress, next occurrence |
| [`DatePicker.dc.html`](design/mobile/DatePicker.dc.html) | [DatePicker.png](design/screens/mobile/DatePicker.png) | Due date | Shortcuts (Today, Tomorrow, This weekend, Next week), "No date", month calendar, time, link to repeat |
| [`RepeatReminder.dc.html`](design/mobile/RepeatReminder.dc.html) | [RepeatReminder.png](design/screens/mobile/RepeatReminder.png) | Repeat and reminders | Repeat options and a list of reminders |
| [`PriorityLabels.dc.html`](design/mobile/PriorityLabels.dc.html) | [PriorityLabels.png](design/screens/mobile/PriorityLabels.png) | Priority and labels | P1 to P4 and label multi-select with "new label" |
| [`Upcoming.dc.html`](design/mobile/Upcoming.dc.html) | [Upcoming.png](design/screens/mobile/Upcoming.png) | Upcoming | Week strip, tasks grouped by day |
| [`Inbox.dc.html`](design/mobile/Inbox.dc.html) | [Inbox.png](design/screens/mobile/Inbox.png) | Inbox | Unsorted tasks, Move action, "added by" a bot |
| [`Project.dc.html`](design/mobile/Project.dc.html) | [Project.png](design/screens/mobile/Project.png) | Project | Sections, "No section", add section, edit pencil in the header |
| [`EditProject.dc.html`](design/mobile/EditProject.dc.html) | [EditProject.png](design/screens/mobile/EditProject.png) | Edit project | Name, colour, parent, pin, archive, delete. Interactive mockup |
| [`Browse.dc.html`](design/mobile/Browse.dc.html) | [Browse.png](design/screens/mobile/Browse.png) | Browse | Inbox, projects, labels, filters, server status |
| [`Search.dc.html`](design/mobile/Search.dc.html) | [Search.png](design/screens/mobile/Search.png) | Search | Text field, condition chips, results, save as filter |
| [`FilterEdit.dc.html`](design/mobile/FilterEdit.dc.html) | [FilterEdit.png](design/screens/mobile/FilterEdit.png) | New filter | Name, conditions, live match count |
| [`Connect.dc.html`](design/mobile/Connect.dc.html) | [Connect.png](design/screens/mobile/Connect.png) | Connect | Server URL, token, connection check, scan QR |
| [`ScanQR.dc.html`](design/mobile/ScanQR.dc.html) | [ScanQR.png](design/screens/mobile/ScanQR.png) | Scan QR | Camera frame and manual fallback |
| [`Settings.dc.html`](design/mobile/Settings.dc.html) | [Settings.png](design/screens/mobile/Settings.png) | Settings | Server, sync state, WAW Bot access with MCP URL and token |
| [`UpdateServer.dc.html`](design/mobile/UpdateServer.dc.html) | [UpdateServer.png](design/screens/mobile/UpdateServer.png) | Old server version | Update command and "continue with limited features" |
| [`OfflineSync.dc.html`](design/mobile/OfflineSync.dc.html) | [OfflineSync.png](design/screens/mobile/OfflineSync.png) | Offline | Banner with waiting count, rows marked "not synced yet" |

### Desktop ([design/desktop/](design/desktop/))

Desktop is three columns: sidebar, list, detail panel. The same screens as mobile are combined rather than redrawn one to one.

| File | Preview | Screen | Covers these mobile screens |
| --- | --- | --- | --- |
| [`Main.dc.html`](design/desktop/Main.dc.html) | [Main.png](design/screens/desktop/Main.png) | Today with the task panel | Today, Task |
| [`QuickAdd.dc.html`](design/desktop/QuickAdd.dc.html) | [QuickAdd.png](design/screens/desktop/QuickAdd.png) | Quick add dialog over Today | Quick add |
| [`Upcoming.dc.html`](design/desktop/Upcoming.dc.html) | [Upcoming.png](design/screens/desktop/Upcoming.png) | Week as seven columns | Upcoming |
| [`Project.dc.html`](design/desktop/Project.dc.html) | [Project.png](design/screens/desktop/Project.png) | Project with the edit panel | Project, Edit project |
| [`Search.dc.html`](design/desktop/Search.dc.html) | [Search.png](design/screens/desktop/Search.png) | Search with the save-filter panel | Search, New filter |
| [`TaskEdit.dc.html`](design/desktop/TaskEdit.dc.html) | [TaskEdit.png](design/screens/desktop/TaskEdit.png) | Task panel with all pickers open | Due date, Repeat and reminders, Priority and labels |
| [`Connect.dc.html`](design/desktop/Connect.dc.html) | [Connect.png](design/screens/desktop/Connect.png) | Connect with deploy steps | Connect, Scan QR (desktop takes a pasted pairing link instead of a camera) |
| [`Settings.dc.html`](design/desktop/Settings.dc.html) | [Settings.png](design/screens/desktop/Settings.png) | Settings | Settings, plus desktop app options, "pair a phone" with a QR code, and preferences |
| [`States.dc.html`](design/desktop/States.dc.html) | [States.png](design/screens/desktop/States.png) | Offline banner, update banner, all done | Offline, Old server version, Today all done |

Inbox and Browse have no desktop mockup: Inbox is a list like Today, and Browse is the sidebar.

## 6. Responsive rules

- Under about 700 px wide: the mobile layout with the tab bar.
- From about 700 to 1100 px: sidebar plus list; the detail panel opens over the list.
- Above about 1100 px: all three columns.

These breakpoints are a proposal. The web client must work at every width; Electron opens at the three-column layout.

## 7. Desktop specifics

- Quick add opens as a centred dialog. The mockup shows the global shortcut as Ctrl or Cmd + Shift + A; the combination is not final.
- Settings has a "Desktop app" group: open at login, keep running in the menu bar or tray, show the task count on the app icon, quick add shortcut.
- Lists support keyboard use: arrows to move, Enter to open, a key to complete. The exact keys are open.
- Hover states exist on desktop only. Use `surface` as the hover fill for rows.

## 8. Accessibility

- Keep the text and background pairs from section 2.
- Never show state by colour alone: priority has the "P1" text, sync state has words, labels have names.
- Every control has a visible label or an accessible name. Icons that only decorate are hidden from screen readers.
- Minimum target 44 px, on desktop too.

## 9. Known gaps in the mockups

Follow this file and [SPEC.md](SPEC.md) where the mockups disagree with them.

- Mobile `OfflineSync` and `EmptyToday` use an older task row without coloured labels and project markers. Build them with the current task row.
- In mobile `Task`, the fields are not linked to the picker screens. In the app, each field opens its picker.
- Desktop `Project` shows a sidebar without the Filters group. The sidebar always includes Filters.
- There are no mockups for: label management, a completed-tasks view, delete confirmations, loading skeletons, dark mode. Design them from the tokens and components here, and flag them for review.
- Sample data (task names, dates, counts) is illustrative.
