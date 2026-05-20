import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext.js';
import { LiquidGlassView, isLiquidGlassSupported } from '../lib/liquidGlass.js';

function ModalContent({ d, theme, title, message, actionBtns, cancelBtn }) {
  return (
    <>
      <View style={{ paddingHorizontal: 26, paddingTop: 32, paddingBottom: 6, alignItems: 'center' }}>
        <Text style={{
          fontSize: 20, fontWeight: '700', color: theme.text,
          letterSpacing: -0.5, textAlign: 'center',
          marginBottom: message ? 10 : 0,
        }}>
          {title}
        </Text>
        {message ? (
          <Text style={{ fontSize: 14.5, color: theme.text2, lineHeight: 22, textAlign: 'center' }}>
            {message}
          </Text>
        ) : null}
      </View>
      <View style={{ padding: 20, paddingTop: 22, gap: 10 }}>
        {actionBtns.map((btn, i) => {
          const isDestructive = btn.style === 'destructive';
          const bg = isDestructive ? theme.typeSt : theme.accent;
          return (
            <Pressable key={btn.text + i} onPress={() => btn.onPress?.()}
              style={({ pressed }) => ({
                borderRadius: 18, paddingVertical: 16,
                backgroundColor: bg, alignItems: 'center', opacity: pressed ? 0.82 : 1,
                shadowColor: bg,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: d ? 0.55 : 0.28,
                shadowRadius: 14, elevation: 8,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
              })}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.2 }}>
                {btn.text}
              </Text>
            </Pressable>
          );
        })}
        {cancelBtn && (
          <Pressable onPress={() => cancelBtn.onPress?.()}
            style={({ pressed }) => ({
              borderRadius: 18, paddingVertical: 15, alignItems: 'center',
              backgroundColor: d
                ? pressed ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)'
                : pressed ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.03)',
              borderWidth: 1, borderColor: d ? 'rgba(255,255,255,0.12)' : theme.border,
            })}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text2, letterSpacing: -0.2 }}>
              {cancelBtn.text}
            </Text>
          </Pressable>
        )}
      </View>
    </>
  );
}

// buttons: [{ text, style?: 'default'|'cancel'|'destructive', onPress? }]
export default function AppModal({ visible, title, message, buttons = [], onDismiss }) {
  const { theme } = useApp();
  const d = theme.isDark;
  const bgAnim    = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bgAnim,    { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 260, friction: 20, useNativeDriver: true }),
      ]).start();
    } else {
      bgAnim.setValue(0);
      scaleAnim.setValue(0.86);
    }
  }, [visible]);

  const liquidGlass = theme.liquidGlassOn && isLiquidGlassSupported && LiquidGlassView;
  const cancelBtn  = buttons.find(b => b.style === 'cancel');
  const actionBtns = buttons.filter(b => b.style !== 'cancel');

  // Always render Modal so the native layer can properly release touch capture on dismiss.
  // Guarding with an early `return null` leaves ghost touch interceptors in Expo.
  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent onRequestClose={onDismiss}>
      {visible && (
        <Animated.View style={[StyleSheet.absoluteFill, {
          backgroundColor: d ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.42)',
          opacity: bgAnim,
          justifyContent: 'center', alignItems: 'center', padding: 28,
        }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

          <Animated.View style={{
            width: '100%', maxWidth: 340,
            transform: [{ scale: scaleAnim }],
            borderRadius: 30,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: d ? 0.35 : 0.20,
            shadowRadius: 24,
            elevation: 20,
          }}>
            <View style={{
              borderRadius: 30, overflow: 'hidden',
              backgroundColor: d ? theme.solid2 : theme.solid,
              borderWidth: 1, borderColor: d ? theme.accentBorder : theme.border,
            }}>
              {liquidGlass && (
                <LiquidGlassView style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 30,
                }} colorScheme={d ? 'dark' : 'light'} />
              )}
              <ModalContent d={d} theme={theme} title={title} message={message} actionBtns={actionBtns} cancelBtn={cancelBtn} />
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}
