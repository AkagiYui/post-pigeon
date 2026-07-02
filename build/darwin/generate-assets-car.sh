#!/usr/bin/env bash
# Compiles darwin/Assets.xcassets (a classic mac appiconset) into darwin/Assets.car
# using actool. This is the icns/appiconset route described in icon-generator.md and
# works with the CLI toolchain — unlike the Icon Composer `.icon` export, which fails
# on some machines ("Icon export exited with status 255"). macOS only (needs sips/actool).
set -euo pipefail

# Run from the build/ directory regardless of where we're invoked from.
cd "$(dirname "$0")/.."

ICONSET="darwin/Assets.xcassets/appicon.appiconset"

# Regenerate every size from the single source of truth (appicon.png, 1024x1024).
for s in 16 32 64 128 256 512; do
  sips -z "$s" "$s" appicon.png --out "$ICONSET/icon_$s.png" >/dev/null
done
cp appicon.png "$ICONSET/icon_1024.png"

# Compile into a temp dir, then copy back only Assets.car (actool also emits a stray
# appicon.icns we don't need — icons.icns is produced by `wails3 generate icons`).
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Drop the unrelated dyld "symbol missing ... AVFCore" noise actool prints on some
# systems, but keep any real actool diagnostics on stderr.
actool darwin/Assets.xcassets \
  --compile "$TMP" \
  --platform macosx --target-device mac \
  --minimum-deployment-target 10.15 \
  --app-icon appicon \
  --output-partial-info-plist "$TMP/partial.plist" \
  >/dev/null 2> >(grep -v '^dyld\[' >&2 || true)

cp "$TMP/Assets.car" darwin/Assets.car
echo "Generated darwin/Assets.car ($(assetutil --info darwin/Assets.car 2>/dev/null | grep -c '"Name" : "appicon"') appicon renditions)"
