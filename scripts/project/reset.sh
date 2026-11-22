#!/usr/bin/env bash
# Returns to a known-good state: removes build and test outputs, then reinstalls from the
# lockfile. Never touches sources, the lockfile, .env or the database.
set -euo pipefail
cd "$(dirname "$0")/../.."
rm -rf apps/*/dist apps/*/out packages/*/dist apps/mobile/.expo coverage
find apps packages -name node_modules -prune -o -name '*.tsbuildinfo' -type f -print0 | xargs -0 rm -f
exec scripts/project/setup.sh
