# The update image of tests/deploy.spec.ts: the baseline build plus one pending migration.
# The build context is a temporary directory that the spec fills.
ARG BASE
FROM ${BASE}
COPY 0001_deploy_probe.sql /opt/waw/apps/core-server/migrations/0001_deploy_probe.sql
COPY _journal.json /opt/waw/apps/core-server/migrations/meta/_journal.json
