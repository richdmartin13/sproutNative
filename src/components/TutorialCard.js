import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTutorial } from '../context/TutorialContext.js';
import { useApp } from '../context/AppContext.js';
import { FONTS } from '../lib/fonts.js';

export default function TutorialCard() {
  const { active, steps, currentStep, step, nextStep, endTutorial } = useTutorial();
  const { theme } = useApp();
  const d = theme.isDark;
  const insets = useSafeAreaInsets();

  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const dotPulse   = useRef(new Animated.Value(1)).current;

  // Animate card in on each step (and on active change)
  useEffect(() => {
    if (!active) {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      return;
    }
    translateY.setValue(20);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, tension: 340, friction: 26, useNativeDriver: true }),
    ]).start();
  }, [active, step]);

  // Pulse animation for action step waiting indicator
  useEffect(() => {
    if (!active || currentStep?.type !== 'action') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(dotPulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, currentStep?.type]);

  if (!active || !currentStep) return null;

  const isAction = currentStep.type === 'action';
  const isFinish = currentStep.type === 'finish';
  const hint     = currentStep.hint; // 'up' | 'down' | undefined

  // Arrow shape pointing up (toward screen content) or down (toward FAB)
  const Arrow = ({ direction }) => (
    <View style={{ alignItems: 'center', marginBottom: direction === 'up' ? 6 : 0, marginTop: direction === 'down' ? 6 : 0 }}>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: 9, borderRightWidth: 9,
        borderTopWidth:    direction === 'down' ? 13 : 0,
        borderBottomWidth: direction === 'up'   ? 13 : 0,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        borderTopColor:    d ? theme.solid2 : '#fff',
        borderBottomColor: d ? theme.solid2 : '#fff',
      }} />
    </View>
  );

  return (
    <>
      {/* Overlay — pointer-events none for action steps so user can tap through */}
      <View
        pointerEvents={isAction ? 'none' : 'auto'}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: isAction ? 'transparent' : 'rgba(0,0,0,0.50)',
        }}
      />

      {/* Card */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + 108,
          left: 16, right: 16,
          opacity,
          transform: [{ translateY }],
        }}
      >
        {hint === 'up' && <Arrow direction="up" />}

        <View style={{
          backgroundColor: d ? theme.solid2 : '#fff',
          borderRadius: 24,
          padding: 22,
          borderWidth: 1,
          borderColor: d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: d ? 0.50 : 0.16,
          shadowRadius: 28,
        }}>

          {/* Header row: dots + skip */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 16 }}>
            {steps.map((_, i) => (
              <View key={i} style={{
                height: 5,
                width: i === step ? 18 : 5,
                borderRadius: 3,
                backgroundColor: i === step
                  ? theme.accent
                  : (d ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)'),
              }} />
            ))}
            <View style={{ flex: 1 }} />
            <Pressable onPress={endTutorial} hitSlop={10}>
              <Text style={{ fontSize: 13, color: theme.muted, fontWeight: '500' }}>Skip</Text>
            </Pressable>
          </View>

          {/* Icon */}
          <Text style={{ fontSize: 30, marginBottom: 8 }}>{currentStep.icon}</Text>

          {/* Title */}
          <Text style={{
            fontSize: 20, fontWeight: '700', color: theme.text,
            fontFamily: FONTS.heading, letterSpacing: -0.3, marginBottom: 7,
          }}>
            {currentStep.title}
          </Text>

          {/* Body */}
          <Text style={{ fontSize: 14.5, color: theme.text2, lineHeight: 22, marginBottom: 18 }}>
            {currentStep.body}
          </Text>

          {/* Action step: pulsing "waiting" indicator */}
          {isAction && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              borderRadius: 12, padding: 12,
            }}>
              <Animated.View style={{
                width: 7, height: 7, borderRadius: 4,
                backgroundColor: theme.accent,
                opacity: dotPulse,
              }} />
              <Text style={{ fontSize: 13, color: theme.muted, flex: 1 }}>
                Waiting — we'll move on when you tap a habit
              </Text>
            </View>
          )}

          {/* Next / Done button — hidden for action steps */}
          {!isAction && (
            <Pressable
              onPress={nextStep}
              style={({ pressed }) => ({
                backgroundColor: theme.accent,
                borderRadius: 14,
                paddingVertical: 13,
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: d ? 0.55 : 0.32,
                shadowRadius: 14,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>
                {isFinish ? 'Done' : 'Next →'}
              </Text>
            </Pressable>
          )}
        </View>

        {hint === 'down' && <Arrow direction="down" />}
      </Animated.View>
    </>
  );
}
