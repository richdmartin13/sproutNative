import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext.js';

export default function Toast() {
  const { toast, clearToast, theme } = useApp();
  const d = theme.isDark;
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;
  const timerRef  = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (toast) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 300, friction: 28, useNativeDriver: true }),
        Animated.timing(opacAnim,  { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, { toValue: -100, duration: 220, useNativeDriver: true }),
          Animated.timing(opacAnim,  { toValue: 0,    duration: 180, useNativeDriver: true }),
        ]).start(() => clearToast());
      }, 2800);
    } else {
      slideAnim.setValue(-100);
      opacAnim.setValue(0);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: insets.top + 10,
        left: 16, right: 16,
        zIndex: 9999,
        transform: [{ translateY: slideAnim }],
        opacity: opacAnim,
      }}
    >
      <View style={{
        backgroundColor: d ? theme.solid2 : theme.solid,
        borderRadius: 18,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: d ? theme.accentBorder : theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: d ? 0.40 : 0.14,
        shadowRadius: 16,
        elevation: 14,
      }}>
        {toast.title ? (
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text,
            marginBottom: toast.message ? 3 : 0 }}>
            {toast.title}
          </Text>
        ) : null}
        {toast.message ? (
          <Text style={{ fontSize: 13.5, color: theme.text2, lineHeight: 19 }}>
            {toast.message}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}
