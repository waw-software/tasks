#!/usr/bin/env bash
# Format, lint and type checks of the workspace; every step runs, any failure fails the check.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
if [ ! -d node_modules ]; then
  scripts/project/quiet.sh "setup" scripts/project/setup.sh || exit 1
fi
failed=0
scripts/project/quiet.sh "format:check" scripts/project/pnpm.sh run format:check || failed=1
scripts/project/quiet.sh "lint" scripts/project/pnpm.sh run lint || failed=1
scripts/project/quiet.sh "typecheck" scripts/project/pnpm.sh run typecheck || failed=1
exit "$failed"
