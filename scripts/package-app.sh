#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export LC_ALL=en_US.UTF-8
ARCH="${1:-universal-apple-darwin}"
META=$(node -e 'const c=require("./src-tauri/tauri.conf.json");process.stdout.write(c.version+"-build"+c.bundle.macOS.bundleVersion)')
OUT="$PWD/releases/GanT-${META}-${ARCH}"
if [[ -e "$OUT" ]]; then echo "该版本产物已存在，请更新版本号或构建号"; exit 1; fi
pnpm exec tauri build --target "$ARCH" --bundles app
APP="$PWD/src-tauri/target/$ARCH/release/bundle/macos/GanT.app"
codesign --verify --deep --strict "$APP"
ACTUAL=$(lipo -archs "$APP/Contents/MacOS/gant-desktop")
if [[ "$ARCH" == universal-apple-darwin ]]; then [[ "$ACTUAL" == *arm64* && "$ACTUAL" == *x86_64* ]]; fi
[[ $(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$APP/Contents/Info.plist") == "${META%-build*}" ]]
[[ $(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$APP/Contents/Info.plist") == "${META##*-build}" ]]
mkdir -p "$OUT"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$OUT/GanT-${META}-${ARCH}.zip"
STAGE=$(mktemp -d)
VERIFY=$(mktemp -d)
trap 'hdiutil detach "$VERIFY/mount" >/dev/null 2>&1 || true; rm -rf "$STAGE" "$VERIFY"' EXIT
ditto "$APP" "$STAGE/GanT.app"
ln -s /Applications "$STAGE/Applications"
hdiutil create -volname GanT -srcfolder "$STAGE" -ov -format UDZO "$OUT/GanT-${META}-${ARCH}.dmg"
hdiutil verify "$OUT/GanT-${META}-${ARCH}.dmg"
hdiutil attach -readonly -nobrowse -mountpoint "$VERIFY/mount" "$OUT/GanT-${META}-${ARCH}.dmg"
codesign --verify --deep --strict "$VERIFY/mount/GanT.app"
hdiutil detach "$VERIFY/mount"
ditto -x -k "$OUT/GanT-${META}-${ARCH}.zip" "$VERIFY/unzip"
codesign --verify --deep --strict "$VERIFY/unzip/GanT.app"
printf '已生成：%s\n架构：%s\n' "$OUT" "$ACTUAL"
