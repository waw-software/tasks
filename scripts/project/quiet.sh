#!/usr/bin/env bash
# Usage: scripts/project/quiet.sh <label> <command> [args...]
# Runs the command with its output captured: silent on success; on failure prints
# "FAIL: <label>", the captured output, and exits with the command's code.
set -uo pipefail
label=$1
shift
out=$(mktemp "${TMPDIR:-/tmp}/quiet.XXXXXX")
trap 'rm -f "$out"' EXIT
"$@" >"$out" 2>&1
code=$?
if [ "$code" -ne 0 ]; then
  echo "FAIL: $label"
  cat "$out"
fi
exit "$code"
