/**
 * GlassCard — Liquid glass at tunable intensity.
 *
 * variant="full"    → nav pill, FAB, sheets — 100% intensity
 * variant="section" → analytics/tap section cards — 40% softened
 * variant="card"    → habit cards, stat cards — 40% softened
 * variant="flat"    → buttons/chips inside cards — no blur, just surface tint + thin border
 */
import React from 'react';
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext.js';

export default function GlassCard({ style, radius = 20, children, variant = 'section', glow }) {
  const { theme } = useApp();
  const d = theme.isDark;
  const T = 'rgba(0,0,0,0)';

  const isFull    = variant === 'full';
  const isFlat    = variant === 'flat';
  const isCard    = variant === 'card';

  // ── Intensity scaling ──────────────────────────────────────────────
  const blurIntensity = isFull ? (d ? 55 : 40)
                      : isFlat ? 0
                      : d ? 22 : 16;

  const bright = isFull
    ? (d ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.92)')
    : (d ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)');

  const tint = isFull
    ? (d ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.48)')
    : (d ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.28)');

  const sheenOpacity = isFull ? 0.70 : 0.38;

  const bevelBright = isFull
    ? (d ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.95)')
    : (d ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.60)');
  const bevelH  = isFull ? 2.5 : 1.5;
  const bevelOp = isFull ? 0.90 : (d ? 0.50 : 0.28);

  // ── Borders ─────────────────────────────────────────────────────────
  // Full: bright top bevel border + dark bottom for depth.
  // Non-full light: transparent top avoids the gray hairline; subtle sides only.
  const borderTop = isFull
    ? (d ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.95)')
    : (d ? 'rgba(255,255,255,0.10)' : 'transparent');
  const borderBot = isFull
    ? (d ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)')
    : theme.border;
  const borderSide = theme.border;

  if (isFlat) {
    return (
      <View style={[{
        borderRadius: radius,
        backgroundColor: theme.surface2,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: glow || 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glow ? (d ? 0.55 : 0.30) : 0,
        shadowRadius: glow ? 8 : 0,
        elevation: glow ? 4 : 0,
      }, style]}>
        {children}
      </View>
    );
  }

  const sheenColors = isCard ? [bright, T, T, tint] : [bright, T];
  const sheenLocs   = isCard ? [0, 0.32, 0.72, 1.0] : [0, 0.30];
  const sheenStart  = { x: 0, y: 0 };
  const sheenEnd    = isCard ? { x: 1, y: 1 } : { x: 0, y: 1 };

  return (
    <View style={[{
      borderRadius: radius,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: borderSide,
      borderTopColor: borderTop,
      borderBottomColor: borderBot,
      shadowColor: glow || 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glow ? (d ? 0.50 : 0.25) : 0,
      shadowRadius: glow ? 12 : 0,
      elevation: glow ? 6 : 0,
    }, style]}>

      {/* 1. Frosted blur */}
      <BlurView
        intensity={blurIntensity}
        tint={d ? 'dark' : 'light'}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: radius,
          backgroundColor: theme.surface,
        }}
      />

      {/* 2. Sheen gradient */}
      <LinearGradient
        colors={sheenColors}
        start={sheenStart} end={sheenEnd}
        locations={sheenLocs}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          borderRadius: radius, opacity: sheenOpacity,
        }}
        pointerEvents="none"
      />

      {/* 3. Inner bevel */}
      <LinearGradient
        colors={[bevelBright, T]}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} locations={[0, 1]}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: bevelH,
          borderTopLeftRadius: radius, borderTopRightRadius: radius, opacity: bevelOp,
        }}
        pointerEvents="none"
      />

      {children}
    </View>
  );
}
