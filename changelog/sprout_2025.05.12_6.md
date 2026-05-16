# sprout_2025.05.12#6

## Native — sproutNative_2025.05.12#6

### THE actual root cause (confirmed via Expo docs research)

Expo SDK 54 ships React 19.1.0 + React Native 0.81.4. All prior builds in this
project had React 18.3.1 + RN 0.76.9 — that's Expo SDK 52. The JS bundle's React
renderer was a different major version than the renderer compiled into the Expo
Go iOS binary. When Expo Go tried to look up `PlatformConstants` via the
TurboModule registry, the call shapes didn't match because RN 0.76's renderer
talks to TurboModules differently than RN 0.81's renderer. Result: every launch
crashed during bundle evaluation.

### Versions corrected
- `react`: `18.3.1` → `19.1.0`
- `react-native`: `0.76.9` → `0.81.4`
- `react-native-safe-area-context`: `4.12.0` → `~5.6.0`
- `react-native-screens`: `~4.4.0` → `~4.16.0`
- `@react-native-async-storage/async-storage`: `2.1.2` → `2.2.0`
- `expo-haptics`: `~14.0.1` → `~15.0.7`
- `expo-file-system`: `~18.0.12` → `~19.0.17`
- `expo-sharing`: `~13.0.1` → `~14.0.7`
- `@expo/vector-icons`: `~14.0.4` → `^15.0.3`
- `@types/react`: `~18.3.12` → `~19.1.10`

### Parity sweep with web
- Added missing violet color scheme (7 schemes total, matches web exactly)
- Confirmed identical `util.js`, `stats.js`, and storage data shape with web
- All 9 prefs.track fields match (mood, energy, ease, duration, resist, trigger, context, tags, notes)
- All 11 prefs.sections fields match (spider, hourly, heatmap, trends, rankings, mood, time, tags, resist, co, log)
- All settings groups present (Appearance, Behavior, Fields, Sections, Data, Changelog)

### Bug audit
- All imports verified to resolve to actual exports
- All Icon `name` values verified to map in Icon.js
- No hooks-in-callbacks, no hooks-in-conditionals
- No imports of removed packages (lucide, svg, router, constants, status-bar, asset, font, splash)
- Icons confirmed 1024×1024 square per SDK 54 schema validator
