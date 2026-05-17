#!/usr/bin/env bash
set -euo pipefail

PROFILES_DIR="$HOME/Library/MobileDevice/Provisioning Profiles"
mkdir -p "$PROFILES_DIR"

# EAS uploads all files referenced in credentials.json to the build machine,
# so the watch profile is available at its credentials.json path.
WATCH_PROFILE="$PWD/certs/watch.mobileprovision"

echo "[watch-profile] Looking for profile at: $WATCH_PROFILE"

if [ ! -f "$WATCH_PROFILE" ]; then
  echo "[watch-profile] ERROR: profile not found — check credentials.json paths"
  exit 1
fi

# Extract UUID using Python (more reliable than grep/sed on plist XML)
UUID=$(python3 - <<EOF
import subprocess, plistlib, sys
raw = subprocess.check_output(["security", "cms", "-D", "-i", "${WATCH_PROFILE}"])
plist = plistlib.loads(raw)
print(plist["UUID"])
EOF
)

echo "[watch-profile] UUID: $UUID"
cp "$WATCH_PROFILE" "$PROFILES_DIR/$UUID.mobileprovision"
echo "[watch-profile] Installed to: $PROFILES_DIR/$UUID.mobileprovision"
