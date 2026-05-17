# certs/

Place your iOS distribution credentials here before running `eas build --profile production`.

Required files:
- `dist.p12` — Distribution certificate exported from Keychain (or downloaded from developer.apple.com)
- `main.mobileprovision` — App Store provisioning profile for bundle ID `sprout.richdmart.in`
- `watch.mobileprovision` — App Store provisioning profile for bundle ID `sprout.richdmart.in.watchkitapp`

Then set the P12 password in `credentials.json` → `password`.

Generate provisioning profiles at:
  https://developer.apple.com/account/resources/profiles/list

This directory is gitignored — never commit actual certificate files.
