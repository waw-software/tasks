---
status: accepted
date: 2026-11-28
decision-makers: oleksandrv (owner)
scope: security
summary: "In the context of a desktop app that connects to the owner's server, facing the need to stay connected across relaunches without exposing a token to page scripts, we decided on a device token of its own, encrypted by the operating system and used only by the main process, and rejected loading the server's web client with its cookie session and keeping the token in the renderer, to achieve a lasting connection that can be revoked per desktop, accepting that nothing is saved without a secure keyring, a failure can leave an orphaned token and renderer scripts can use the bridge while the app runs."
supersedes: []
---

# The desktop keeps its own device token in the main process, encrypted by the operating system

## Context and Problem Statement

The desktop app has to connect to the owner's server and keep that connection across relaunches
([REQ-007](../requirements.md)). [ADR 0003](0003-web-session-and-server-compatibility.md) covers
how browsers stay signed in, not the desktop. Device tokens, Bearer authentication and pairing links
stay as decided in [ADR 0002](0002-device-authentication.md). Where does the desktop keep its
credential, how is it protected, and which process may use it?

## Considered Options

* A. A token in the main process, encrypted with Electron's `safeStorage`, and a preload bridge
* B. Loading the server's web client and using its cookie session
* C. A token in the renderer

## Decision Outcome

Chosen option: "A. A token in the main process, encrypted with Electron's `safeStorage`, and a
preload bridge", because the desktop stays connected and page scripts cannot read the token it
keeps.

* **Own token.** After the user enters a server URL and a token, the desktop creates a device token
  of its own and keeps only that one. A pairing link gives the desktop its own token. One credential
  is active at a time.
* **Storage.** The record is replaced atomically, is private (mode 0600) and holds the token only in
  encrypted form. If a new credential cannot be saved, the old record is removed and the connection
  lasts for this run only. On a clean quit, the app tries to revoke such an unsaved token within a
  limited time. On Linux with the `basic_text` backend (no keyring), nothing is saved. If the keyring
  is unavailable at launch, the app keeps the record and shows Connect.
* **Sign-out.** The desktop revokes its token on the server and forgets it. If the server is
  unreachable, the desktop keeps the credential.
* **Process boundary.** The main process makes every request to the server, with
  `credentials: "omit"`, and refuses redirects. The renderer holds what the user types only while
  they type it, and never receives a minted, redeemed or stored token. The preload bridge passes
  its calls to the main process. IPC is accepted only from the app window's main frame on the app
  URL. The bridge and this IPC check are wired in a following pull request.

Rejected: B, as the server's own web client would never show the update screen for an old server,
nothing would load offline, and a later privileged preload would be exposed to remote content; C, as
it needs CORS on the server and page scripts could read the token, the reason ADR 0003 rejected
browser storage.

### Consequences

* Good, because the token the owner types to connect is never saved on the desktop.
* Good, because each desktop can be revoked by itself.
* Good, because page scripts cannot read the token that the desktop keeps.
* Bad, because on Linux without a keyring the user has to connect on every launch.
* Bad, because a crash, or a lost reply when a token is created or a pairing link is redeemed, can
  leave an orphaned device token that the user has to revoke on the server. The same applies to an
  unsaved token that was not revoked at quit.
* Bad, because a script in the renderer can use the bridge while the app runs.
* Bad, because a keyring that is unavailable at launch leads to Connect, and connecting then
  replaces the kept record or, if the new credential cannot be saved, removes it.

### Confirmation

`apps/desktop/src/main/credential-store.test.ts` checks the stored record and when saving is
refused. `apps/desktop/src/main/transport.test.ts` checks how requests are sent.
`apps/desktop/src/main/connection.connect.test.ts` and
`apps/desktop/src/main/connection.session.test.ts` check which token is kept, restore, sign-out and
revocation.

Not checked yet: which IPC senders are accepted and where the window may navigate, by
`ipc.test.ts` and `web-target.test.ts` in the pull request that wires the bridge; the desktop
journeys in Electron, by tests in the pull request after that.
