#!/usr/bin/env bash
# Unit tests of the workspace: offline and deterministic.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
if [ ! -d node_modules ]; then
  scripts/project/quiet.sh "setup" scripts/project/setup.sh || exit 1
fi
exec scripts/project/quiet.sh "test:unit" scripts/project/pnpm.sh run test:unit
