#!/usr/bin/env bash
# Build a Chrome Web Store zip (extension files only).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./manifest.json').version")"
OUT_DIR="$ROOT/dist"
NAME="atcoder-dark-${VERSION}"
STAGE="$OUT_DIR/$NAME"
ZIP="$OUT_DIR/${NAME}.zip"

rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE"

# Extension runtime files only
copy_paths=(
  manifest.json
  LICENSE
  README.md
  icons
  _locales
  content
  lib
  popup
  styles
)

for p in "${copy_paths[@]}"; do
  if [[ -e "$p" ]]; then
    cp -a "$p" "$STAGE/"
  fi
done

# Optional: include privacy doc inside zip for reviewers
mkdir -p "$STAGE/docs"
cp -a docs/privacy.md "$STAGE/docs/" 2>/dev/null || true

# Sanity: no secrets / dev junk
rm -rf "$STAGE/node_modules" "$STAGE/.chrome-profile" "$STAGE/screenshots" || true

(
  cd "$OUT_DIR"
  rm -f "${NAME}.zip"
  # zip contents at root of archive (manifest.json at zip root)
  (cd "$NAME" && zip -r -q "../${NAME}.zip" .)
)

echo "Packed: $ZIP"
echo "Size:   $(du -h "$ZIP" | cut -f1)"
echo "Files:"
unzip -l "$ZIP" | head -60
