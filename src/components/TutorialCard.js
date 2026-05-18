import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, Animated, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTutorial } from '../context/TutorialContext.js';
import { useApp } from '../context/AppContext.js';
import {
  Home, BarChart3, Settings, Plus, Zap, List, Clock,
  TrendingUp, Palette, PenLine, ArrowRight,
} from './Icon.js';
import { FONTS } from '../lib/fonts.js';
import { LiquidGlassView, isLiquidGlassSupported } from '../lib/liquidGlass.js';

const H = Dimensions.get('window').height;

const ICON_MAP = {
  Home, BarChart3, Settings, Plus, Zap, List, Clock,
  TrendingUp, Palette, PenLine, ArrowRight,
};

export default function TutorialCard() {
  const { active, steps, currentStep, step, nextStep, endTutorial } = useTutorial();
  const { theme } = useApp();
  const d = theme.isDark;
  const insets = useSafeAreaInsets();
  const liquidGlass = theme.liquidGlassOn && isLiquidGlassSupported && LiquidGlassView;

  const slideY   = useRef(new Animated.Value(H)).current;
  const bgAlpha  = useRef(new Animated.Value(0)).current;
  const dotPulse = useRef(new Animated.Value(1)).current;
  const prevShowRef = useRef(false);

  const isAction = currentStep?.type === 'action';
  const isFinish = currentStep?.type === 'finish';
  const showSheet = active && !isAction;
  const showPill  = active && isAction;

  // Animate sheet in whenever it transitions from hidden → visible, or on step change
  useEffect(() => {
    if (showSheet && !prevShowRef.current) {
      slideY.setValue(300);
      bgAlpha.setValue(0);
      Animated.parallel([
        Animated.timing(bgAlpha, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, tension: 68, friction: 11, useNativeDriver: true }),
      ]).start();
    }
    prevShowRef.current = showSheet;
  }, [showSheet, step]);

  // Pulse dot for action step pill
  useEffect(() => {
    if (!showPill) { dotPulse.stopAnimation(); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.25, duration: 650, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1,    duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showPill]);

  if (!active || !currentStep) return null;

  const IconComp = ICON_MAP[currentStep.icon];

  // ── Action step: non-blocking floating pill ──────────────────────────────────
  if (showPill) {
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View pointerEvents="box-none" style={{
          position: 'absolute',
          bottom: insets.bottom + 112,
          left: 16, right: 16,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: d ? theme.solid2 : '#fff',
            borderRadius: 20, padding: 16,
            borderWidth: 1, borderColor: d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
            shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
            shadowOpacity: d ? 0.38 : 0.12, shadowRadius: 18,
          }}>
            <Animated.View style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: theme.accent, opacity: dotPulse,
            }} />
            <Text style={{ flex: 1, fontSize: 14, color: theme.text2, lineHeight: 20 }}>
              {currentStep.body}
            </Text>
            <Pressable onPress={endTutorial} hitSlop={12}>
              <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '500' }}>Skip</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ── Info / finish step: slide-up modal sheet ─────────────────────────────────
  return (
    <Modal
      visible={showSheet}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={endTutorial}
    >
      {/* Dim backdrop */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: bgAlpha }]}
      />

      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View style={{
          transform: [{ translateY: slideY }],
          ...(liquidGlass ? {} : {
            backgroundColor: d ? theme.solid2 : '#fff',
            borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
            borderColor: d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
          }),
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 28,
          shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
          shadowOpacity: d ? 0.30 : 0.13, shadowRadius: 24,
        }}>
          {liquidGlass && (
            <LiquidGlassView style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
            }} colorScheme={d ? 'dark' : 'light'} />
          )}

          {/* Grab handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2,
              backgroundColor: d ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }} />
          </View>

          {/* Progress dots + skip */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 16, paddingBottom: 22 }}>
            {steps.map((_, i) => (
              <View key={i} style={{
                height: 5, borderRadius: 3,
                width: i === step ? 20 : 5,
                backgroundColor: i === step
                  ? theme.accent
                  : (d ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'),
              }} />
            ))}
            <View style={{ flex: 1 }} />
            <Pressable onPress={endTutorial} hitSlop={14}>
              <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '500' }}>Skip</Text>
            </Pressable>
          </View>

          {/* Icon badge */}
          {IconComp && (
            <View style={{
              width: 54, height: 54, borderRadius: 16,
              backgroundColor: theme.accentDim,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 18,
              shadowColor: theme.accent, shadowOffset: { width: 0, height: 3 },
              shadowOpacity: d ? 0.45 : 0.22, shadowRadius: 10,
            }}>
              <IconComp size={26} strokeWidth={1.75} color={theme.accent} />
            </View>
          )}

          {/* Title */}
          <Text style={{
            fontSize: 22, fontWeight: '700', color: theme.text,
            fontFamily: FONTS.heading, letterSpacing: -0.4, marginBottom: 9,
          }}>
            {currentStep.title}
          </Text>

          {/* Body */}
          <Text style={{ fontSize: 15, color: theme.text2, lineHeight: 23, marginBottom: 28 }}>
            {currentStep.body}
          </Text>

          {/* CTA button */}
          <Pressable
            onPress={nextStep}
            style={({ pressed }) => ({
              backgroundColor: theme.accent,
              borderRadius: 16, paddingVertical: 15, alignItems: 'center',
              opacity: pressed ? 0.84 : 1,
              shadowColor: theme.accent,
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: d ? 0.55 : 0.30,
              shadowRadius: 16,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
              {isFinish ? 'Done' : 'Next'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
