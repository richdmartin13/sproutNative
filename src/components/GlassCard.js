/**
 * GlassCard — Flat skeuomorphic cards with soft accent glows.
 *
 * variant="full"    → nav pill, sheets — slightly elevated surface
 * variant="section" → analytics/tap section cards
 * variant="card"    → habit cards, stat cards
 * variant="flat"    → inline chips/buttons — no shadow
 *
 * When prefs.dev.liquidGlass is on AND the @callstack/liquid-glass library is
 * installed (update src/lib/liquidGlass.js to real imports), renders iOS 26
 * liquid glass instead of the flat skeuomorphic style.
 */
import React from 'react';
import { View } from 'react-native';
import { useApp } from '../context/AppContext.js';
import { LiquidGlassView, isLiquidGlassSupported } from '../lib/liquidGlass.js';

export default React.memo(function GlassCard({ style, radius = 20, children, variant = 'section', glow }) {
  const { theme } = useApp();
  const d = theme.isDark;

  const isFull = variant === 'full';
  const isFlat = variant === 'flat';

  const glowColor = glow || theme.accent;
  const shadowOn  = theme.shadowsOn;
  const liquidGlass = theme.liquidGlassOn && isLiquidGlassSupported && LiquidGlassView;

  const bg = d
    ? (isFull ? theme.solid2 : theme.solid)
    : theme.solid;

  const borderColor = d
    ? (isFull ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.08)')
    : theme.border;

  if (liquidGlass) {
    return (
      <LiquidGlassView
        style={[{ borderRadius: radius }, style]}
        colorScheme={d ? 'dark' : 'light'}
      >
        {children}
      </LiquidGlassView>
    );
  }

  if (isFlat) {
    return (
      <View style={[{
        borderRadius: radius,
        backgroundColor: d ? theme.solid2 : theme.solid,
        borderWidth: 1,
        borderColor,
        ...(shadowOn && glow ? {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: d ? 0.40 : 0.18,
          shadowRadius: 6,
          elevation: 3,
        } : {}),
      }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[{
      borderRadius: radius,
      backgroundColor: bg,
      borderWidth: 1,
      borderColor,
      overflow: 'hidden',
      ...(shadowOn ? {
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: isFull ? 4 : 2 },
        shadowOpacity: d
          ? (isFull ? 0.50 : 0.32)
          : (isFull ? 0.20 : 0.12),
        shadowRadius: isFull ? 20 : 10,
        elevation: isFull ? 10 : 4,
      } : {}),
    }, style]}>
      {children}
    </View>
  );
});
