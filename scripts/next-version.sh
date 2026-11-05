#!/usr/bin/env bash
# Prints version=vN for the next release, or nothing if HEAD is already released.
set -euo pipefail

released=$(git tag --points-at HEAD | grep -E '^v[0-9]+$' || true)
if [[ -n "$released" ]]; then
  echo "HEAD is already released as $released" >&2
  exit 0
fi

latest=$(git tag --list | grep -E '^v[0-9]+$' | sed 's/^v//' | sort -n | tail -1 || true)
echo "version=v$((${latest:-0} + 1))"
