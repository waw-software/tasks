---
status: accepted
date: 2026-11-26
decision-makers: oleksandrv (owner)
scope: security
summary: "In the context of a browser client and a server that updates independently of its clients, facing the need to stay signed in safely and to say when a server is too old, we decided on a separate revocable device token per browser in an HttpOnly cookie, and an update screen on a missing known capability or a lower API version, and rejected asking for the token on every visit, keeping it in browser storage, checking only the API version and a fixed core set, to achieve a safe lasting session and visible limits, accepting that cookie requests need their own protection and the capability list must grow with each server feature."
supersedes: []
---

# The browser keeps a session in an HttpOnly cookie, and a missing capability marks a server as too old

## Context and Problem Statement

The web client has to connect to the owner's server ([REQ-007](../requirements.md)), and clients and
the server update independently ([REQ-010](../requirements.md),
[SPEC versioning](../SPEC.md#32-versioning-between-client-and-server)). Does a browser stay signed
in, and if so, what does it keep? When is a server too old for a client? This record covers
architecture as well as security. Setup, pairing and device tokens stay as decided in
[ADR 0002](0002-device-authentication.md).

## Considered Options

Web session:

* A separate, revocable device token for each browser in an HttpOnly cookie
* Asking for the token on every visit
* Keeping the token in browser storage

Server compatibility:

* Too old on a missing known capability or a lower `apiVersion`
* Too old on a lower `apiVersion` only
* Too old when a capability from a fixed minimum core set is missing

## Decision Outcome

### Web session

Chosen option: "A separate, revocable device token for each browser in an HttpOnly cookie", because
the owner enters a token once, scripts on the page cannot read what the browser keeps, and each
browser can be cut off by itself.

* After the owner enters a device token, the server issues the browser its own session token (a
  revocable device of its own, `waw_ses_` instead of `waw_dev_`) in an HttpOnly, SameSite=Strict
  cookie. The cookie is Secure, except over plain http on loopback. It lasts 400 days and is
  refreshed on use. Sign-out revokes the browser's token.
* The server accepts the session token only as the cookie, and only to check the session and to sign
  out; it refuses it as a Bearer token. Cookies also reach other ports of the same host, so a
  service there that receives the cookie cannot issue tokens or pairing links with it.
* A cookie write needs a matching `Origin`. The session over plain http from a non-loopback address
  is refused.

Rejected: asking for the token on every visit, as it is tiring and has the owner typing their token
often; keeping the token in browser storage, as any script on the page can read it.

### Server compatibility

Chosen option: "Too old on a missing known capability or a lower `apiVersion`", because the user
learns which features the server lacks, also between servers of the same API version.

* A server is too old when it lacks a capability the client knows, or reports a lower `apiVersion`
  than the client's.
* The client then shows "Your server needs an update" with "Continue with limited features", which
  hides exactly the missing features. The choice is remembered until the server's capability list
  changes.
* The capabilities are listed in [SPEC versioning](../SPEC.md#32-versioning-between-client-and-server).

Rejected: a lower `apiVersion` only, as missing features would be hidden silently and the screen could
never appear within API v1; a fixed minimum core set, as each milestone would need a decision on what
is core.

### Consequences

* Good, because the browser stays signed in without keeping a token that page scripts can read.
* Good, because a script in the page cannot use the cookie to create a credential that outlives
  sign-out.
* Good, because the user is told which features an older server lacks.
* Bad, because cookie requests need their own protection, and a reverse proxy must pass on the public
  host and the use of HTTPS.
* Bad, because the server has two kinds of device token, told apart by their prefix.
* Bad, because every milestone that adds a server feature must add its capability, and the client's
  list of known capabilities grows with it.

### Confirmation

`apps/core-server/test/cookie-auth.test.ts` checks the cookie's limits and the `Origin` rule, and
`packages/api-contract/test/compatibility.test.ts` checks when a server is too old and how long
limited mode is remembered. `packages/e2e/tests/connect-web.spec.ts` checks the browser journeys in
Chromium against a real server: staying signed in, sign-out, revocation, the cross-origin refusals
and the update screen.
