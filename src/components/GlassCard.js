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

  const isFull = variant === 'full';
  const isFlat = variant === 'flat';
  const isCard = variant === 'card';

  // ── Blur intensity ──────────────────────────────────────────────────
  // Light mode needs higher intensity to overcome the lighter background
  const blurIntensity = isFull ? (d ? 55 : 72)
                      : isFlat ? 0
                      : d ? 22 : 38;

  // ── BlurView background ─────────────────────────────────────────────
  // Dark mode: near-opaque dark surface tint looks great.
  // Light mode: was ~90% white — completely killed the blur effect.
  // Fix: keep it translucent so the warm bg (#f4f0e8) bleeds through.
  const blurBg = isFull
    ? (d ? theme.surface : 'rgba(255,255,255,0.52)')
    : (d ? theme.surface : 'rgba(255,255,255,0.28)');

  // ── Sheen gradient ──────────────────────────────────────────────────
  const bright = isFull
    ? (d ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.82)')
    : (d ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.52)');

  const tint = isFull
    ? (d ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.28)')
    : (d ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.14)');

  // Lower sheen in light so blur effect isn't hidden behind a white veil
  const sheenOpacity = isFull
    ? (d ? 0.70 : 0.40)
    : (d ? 0.38 : 0.18);

  // ── Bevel ───────────────────────────────────────────────────────────
  const bevelBright = isFull
    ? (d ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.90)')
    : (d ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.68)');
  const bevelH  = isFull ? 2.5 : 1.5;
  const bevelOp = isFull ? (d ? 0.90 : 0.72) : (d ? 0.50 : 0.42);

  // ── Borders ─────────────────────────────────────────────────────────
  // Light mode: warm-neutral borders add definition without looking clinical
  const borderTop = isFull
    ? (d ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.95)')
    : (d ? 'rgba(255,255,255,0.10)' : 'rgba(195,190,178,0.50)');
  const borderBot = isFull
    ? (d ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)')
    : (d ? theme.border : 'rgba(175,170,158,0.30)');
  const borderSide = d
    ? theme.border
    : (isFull ? 'rgba(200,195,183,0.30)' : 'rgba(188,184,172,0.28)');

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
          backgroundColor: blurBg,
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
