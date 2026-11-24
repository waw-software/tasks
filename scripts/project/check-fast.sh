#!/usr/bin/env bash
# Fast check for the Stop hook: Biome on the changed files, then the typecheck and unit tests of
# the packages changed since the base (all of them when a root config changed). Silent on success.
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
# shellcheck source=scripts/lib/git-base.sh
. scripts/lib/git-base.sh
if [ ! -d node_modules ]; then
  scripts/project/quiet.sh "setup" scripts/project/setup.sh || exit 1
fi
base=$(resolve_base "") || exit 1

files=()
while IFS= read -r -d '' f; do
  [ -e "$f" ] && files+=("$f")
done < <({
  git diff --name-only -z --diff-filter=d "$base" --
  git ls-files -z --others --exclude-standard
} | sort -zu)

pnpm=scripts/project/pnpm.sh
q=scripts/project/quiet.sh
failed=0
biome=()
root_changed=
for f in "${files[@]+"${files[@]}"}"; do
  case "$f" in
    *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.mts | *.cts | *.json | *.jsonc | *.css) biome+=("$f") ;;
  esac
  case "$f" in
    package.json | pnpm-lock.yaml | pnpm-workspace.yaml | tsconfig.base.json | biome.json) root_changed=1 ;;
  esac
done
if [ "${#biome[@]}" -gt 0 ]; then
  $q "biome format" $pnpm exec biome format --no-errors-on-unmatched "${biome[@]}" || failed=1
  $q "biome lint" $pnpm exec biome lint --error-on-warnings --no-errors-on-unmatched "${biome[@]}" || failed=1
fi
$q "build:shared" $pnpm build:shared || exit 1
if [ -n "$root_changed" ]; then
  $q "typecheck" $pnpm run typecheck || failed=1
  $q "test:unit" $pnpm run test:unit || failed=1
else
  $q "typecheck" $pnpm --filter "...[$base]" run typecheck || failed=1
  $q "test" $pnpm --filter "...[$base]" run test || failed=1
fi
exit "$failed"
