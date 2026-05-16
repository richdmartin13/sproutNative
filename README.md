# Sprout Native — sproutNative_2025.05.12#9

Runs in **Expo Go** (SDK 54, React Native 0.81.4, React 19.1.0).

## Setup

```bash
npm install
npx expo start
```

> **Important:** `npm install` uses `.npmrc` (`legacy-peer-deps=true`) and
> `package.json` `overrides` to force a single React 19.1.0 copy across all
> dependencies. This is required because `lucide-react-native` declares older
> peer deps. Do **not** remove the `overrides` or `.npmrc` entries.

## Why these exact versions

| Package | Version | Reason |
|---|---|---|
| `expo` | `~54.0.0` | SDK version |
| `react` | `19.1.0` | Exact match for Expo Go SDK 54 binary |
| `react-native` | `0.81.4` | Exact match for Expo Go SDK 54 binary |
| `react-native-svg` | `15.11.2` | Bundled in Expo Go; required by lucide |
| `lucide-react-native` | `0.475.0` | Pinned exact version; same icons as web |
| `overrides.react` | `19.1.0` | Prevents npm installing React 18 inside lucide |

## Data compatibility

Export format is identical to the web app: `sproutData_yyyy.mm.dd#hh.mm.json`
Sample data for testing: `assets/sample_data.json`

## Import in the app

Settings → Data → Import → pick the `.json` file from your device.

## Build for production

```bash
eas build --platform ios
eas build --platform android
```
