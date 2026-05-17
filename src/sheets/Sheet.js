import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, Pressable, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from '../components/Icon.js';
import GlassCard from '../components/GlassCard.js';
import { FONTS } from '../lib/fonts.js';
import { useApp } from '../context/AppContext.js';

const H = Dimensions.get('window').height;

export default function Sheet({ title, subtitle, onClose, children }) {
  const { theme } = useApp();
  const insets  = useSafeAreaInsets();
  const slideY  = useRef(new Animated.Value(H)).current;
  const bgAlpha = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgAlpha, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideY,  { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(bgAlpha, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideY,  { toValue: H, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay, opacity: bgAlpha }]} pointerEvents="auto">
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none">
        <Animated.View style={{
          transform: [{ translateY: slideY }],
          backgroundColor: theme.solid,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
          borderColor: theme.border,
          maxHeight: H * 0.92,
          paddingBottom: insets.bottom + 16,
          shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
          shadowOpacity: theme.isDark ? 0.28 : 0.14, shadowRadius: 20, elevation: 24,
        }}>
          {/* Grab handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 2 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border2 }} />
          </View>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: '700', color: theme.text, letterSpacing: -0.4 }}>{title}</Text>
              {subtitle ? <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={close}
              style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.solid3, alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} strokeWidth={2} color={theme.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
