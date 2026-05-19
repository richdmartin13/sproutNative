// Liquid Glass is only loaded in production standalone builds.
// Expo Go ('storeClient') skips it entirely — no native module, no fallback noise.
// In standalone builds the TurboModuleRegistry.get check still guards against
// older iOS devices that lack the native module.
import { TurboModuleRegistry } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

let LiquidGlassView = null;
let LiquidGlassContainerView = null;
let isLiquidGlassSupported = false;

if (!isExpoGo && TurboModuleRegistry.get('NativeLiquidGlassModule')) {
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
