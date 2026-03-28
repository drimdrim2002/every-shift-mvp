#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_DIR="$ROOT_DIR/tools/skills/codex-mirror"
DEST_ROOT="${CODEX_HOME:-$HOME/.codex}/skills"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "[ERROR] Source mirror directory not found: $SRC_DIR" >&2
  exit 1
fi

mkdir -p "$DEST_ROOT"

echo "[INFO] Source: $SRC_DIR"
echo "[INFO] Destination: $DEST_ROOT"

for src in "$SRC_DIR"/everyshift-*; do
  [[ -d "$src" ]] || continue
  name="$(basename "$src")"
  dest="$DEST_ROOT/$name"

  echo
  echo "=== $name ==="
  if [[ -d "$dest" ]]; then
    echo "[INFO] Existing destination found. Diff preview:"
    diff -ru "$dest" "$src" || true

    read -r -p "Overwrite $dest ? [y/N]: " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
      echo "[SKIP] $name"
      continue
    fi
  else
    echo "[INFO] New install target."
  fi

  rm -rf "$dest"
  cp -R "$src" "$dest"
  echo "[OK] Synced $name"
done

echo
echo "[DONE] Sync completed. Restart Codex to pick up updated skills."
