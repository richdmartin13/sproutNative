# certs/

iOS distribution credentials for Codemagic CI builds.

## Files

| File | Purpose | Bundle ID |
|------|---------|-----------|
| `dist.p12` | Distribution certificate (gitignored) | — |
| `main_appstore.mobileprovision` | Main app — App Store | `sprout.richdmart.in` |
| `watch_appstore.mobileprovision` | Watch app — App Store | `sprout.richdmart.in.watchkitapp` |
| `widget_appstore.mobileprovision` | iOS widget extension — App Store | `sprout.richdmart.in.SproutWidget` |
| `watch_widget_appstore.mobileprovision` | watchOS widget extension — App Store | `sprout.richdmart.in.watchkitapp.SproutWatchWidget` |

All four profiles must include the App Group `group.sprout.richdmart.in`.

## Updating profiles

Download the new `.mobileprovision` from developer.apple.com and rename it to match the filename above before committing. The P12 (`dist.p12`) stays local — it is gitignored.
