# sprout_2025.05.12#7

## Native — sproutNative_2025.05.12#7

### Bug fix
`Cannot find module 'babel-preset-expo'` Metro bundling error.

**Cause:** In the v6 cleanup I removed `babel-preset-expo` from `devDependencies`
based on the SDK 55 migration guide note that says it's "managed internally" —
but that's only true when `babel.config.js` is **deleted entirely**. Our project
keeps a `babel.config.js` that explicitly references `babel-preset-expo`, so
Metro requires the package to be installed.

**Fix:**
- Added `babel-preset-expo: ~13.0.0` to devDependencies (canonical SDK 54 version)
- Bumped `@babel/core: ^7.20.0` to match what `babel-preset-expo` 13.x expects
