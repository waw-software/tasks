---
status: accepted
date: 2026-11-26
decision-makers: oleksandrv (owner)
scope: security
summary: "In the context of a self-hosted server with one user and several client devices, facing the need to set it up, pair devices and cut off a lost one without required configuration, we decided on opaque per-device tokens stored as digests, a setup code from the server log, single-use pairing links and generated deployment secrets, and rejected a shared plaintext token, signed tokens, unguarded or file-only setup, app-scheme or 10-minute links, a required database password and an automatic pre-migration dump, to achieve a simple deployment with individually revocable access, accepting that every device token has full owner rights and backups are the operator's job."
supersedes: []
---

# Each device holds its own opaque token, and a server is set up with a code from its log

## Context and Problem Statement

A user deploys the server on their own machine, opens it for the first time and connects their
devices to it ([REQ-011](../requirements.md), [SPEC deployment](../SPEC.md#31-deployment-and-first-run),
[SPEC auth](../SPEC.md#33-auth), [SPEC API sketch](../SPEC.md#6-api-sketch-proposed)). A server that
is reachable before its owner has claimed it must not hand access to a stranger, and clients that
update independently ([REQ-010](../requirements.md)) will depend on the credential format. How are
devices authenticated, and how is a server set up and paired? This record covers the device and
pairing credentials, not the bot token. Where it differs from the proposals in the SPEC, it applies.

## Considered Options

* Opaque per-device tokens, setup guarded by a code in the server log, single-use pairing links, generated deployment secrets
* One shared plaintext token
* Signed (JWT or HMAC) tokens
* Setup where the first visitor sees the token without a code
* A setup code that is only in a file in the container
* A `waw://` app-scheme pairing link
* A pairing link that lasts 10 minutes
* A required `POSTGRES_PASSWORD`
* An automatic database dump before migrations

## Decision Outcome

Chosen option: "Opaque per-device tokens, setup guarded by a code in the server log, single-use
pairing links, generated deployment secrets", because each device can be cut off by itself, only
someone who can read the server log can claim the server, and the user has nothing to configure.

* **Tokens.** A server has one user. Each device holds its own opaque token, `waw_dev_` followed by
  32 random bytes in base64url, and sends it as `Authorization: Bearer`. The server stores only its
  SHA-256 digest. Tokens are revoked one by one. Every device token has full owner rights.
* **First run.** On a start while unclaimed, the server prints a one-time setup code to its log. The
  setup page asks for the code before it shows the access token. After one successful claim, setup
  is closed for good. A lost token is recovered with the operator CLI inside the container.
* **Pairing.** The link is `https://<server>/pair#token=waw_pair_…`. It works once, expires after
  1 hour, and any device can issue a new one. The token is in the URL fragment, so it never reaches
  server or proxy logs.
* **Server address.** It comes from the request, including the headers of a trusted proxy. An
  optional `PUBLIC_URL` overrides it.
* **Deployment.** No configuration is required. The Postgres password is generated on first start
  into a volume. Nothing dumps the database before migrations; the operator backs up the Postgres
  volume before updating.

Rejected: one shared plaintext token, as one lost device cannot be cut off without cutting off all;
signed (JWT or HMAC) tokens, as they add a signing key, and revoking one still needs server state;
showing the token to the first visitor, as a stranger who gets there first would own the server; a
code only in a container file, as the owner chose to print it to the log; a `waw://` app-scheme
link, as the owner chose an HTTPS link on the server's own address; a 10-minute pairing link, as the
owner chose 1 hour; a required `POSTGRES_PASSWORD`, as it makes the user configure something before
the first start; an automatic pre-migration dump, as the owner left backups to the operator.

### Consequences

* Good, because revoking one device leaves the others working.
* Good, because the database holds no usable token, only digests.
* Good, because the server starts with no required configuration.
* Bad, because any device token, if stolen, gives full owner rights until it is revoked.
* Bad, because setup needs access to the server log, and recovery needs access to the container.
* Bad, because the HTTPS pairing link works only where the server is served over TLS.
* Bad, because an operator who skipped the backup has no dump to return to after a failed update.

### Confirmation

`packages/e2e/tests/auth.spec.ts` checks device tokens against real Postgres: digest-only storage,
bearer authentication, revocation one by one, and issuing and revoking with the operator CLI.

Not checked yet: the deployment configuration, by the Compose deployment spec in part 4 of M3;
pairing links and the server address, by the pairing spec in part 5 of M3; the setup code, the
one-time claim and recovery that leaves setup closed, by the setup spec in part 6 of M3.
