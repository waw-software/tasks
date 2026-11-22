#!/usr/bin/env bash
# Runs the pnpm version pinned in package.json (packageManager): the one on PATH when it matches,
# otherwise a copy fetched with npm exec.
set -euo pipefail
cd "$(dirname "$0")/../.."
version=$(node -e 'const p=require("./package.json").packageManager; process.stdout.write(p.replace(/^pnpm@/, "").replace(/\+.*$/, ""))')
if command -v pnpm >/dev/null 2>&1 && [ "$(pnpm --version 2>/dev/null)" = "$version" ]; then
  exec pnpm "$@"
fi
exec npm exec --yes --package="pnpm@$version" -- pnpm "$@"
