// Guard @callstack/liquid-glass behind a TurboModuleRegistry.get check so the
// native-module-not-found error is never thrown in the first place (Expo Go,
// simulator, older iOS).  getEnforcing in NativeLiquidGlassModule.js fires at
// module-evaluation time and can leave the JS runtime in a broken state even
// when caught; the non-throwing .get() prevents that entirely.
import { TurboModuleRegistry } from 'react-native';

let LiquidGlassView = null;
let LiquidGlassContainerView = null;
let isLiquidGlassSupported = false;

if (TurboModuleRegistry.get('NativeLiquidGlassModule')) {
  try {
    const lg = require('@callstack/liquid-glass');
    LiquidGlassView          = lg.LiquidGlassView          ?? null;
    LiquidGlassContainerView = lg.LiquidGlassContainerView ?? null;
    isLiquidGlassSupported   = lg.isLiquidGlassSupported   ?? false;
  } catch (_) {
    // Native module present but JS-side failed — stay with null stubs
  }
}

export { LiquidGlassView, LiquidGlassContainerView, isLiquidGlassSupported };
