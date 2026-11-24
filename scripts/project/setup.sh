#!/usr/bin/env bash
# Sets up a checkout: installs the workspace from the lockfile, never changing it.
set -euo pipefail
cd "$(dirname "$0")/../.."
CI=1 exec scripts/project/pnpm.sh install --frozen-lockfile
