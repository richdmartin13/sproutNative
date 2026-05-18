import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { Home, BarChart3, Settings, Plus } from '../components/Icon.js';
import { useApp } from '../context/AppContext.js';
import { LiquidGlassView, LiquidGlassContainerView, isLiquidGlassSupported } from '../lib/liquidGlass.js';

const TABS = [
  { id:'home',     label:'Habits',    Icon:Home      },
  { id:'insights', label:'Analytics', Icon:BarChart3  },
  { id:'settings', label:'Settings',  Icon:Settings   },
];

function NavBtn({ item, active, onPress }) {
  const { theme } = useApp();
  const d = theme.isDark;
  const liquidGlass = theme.liquidGlassOn && isLiquidGlassSupported && LiquidGlassView;

  const widthAnim  = useRef(new Animated.Value(active ? 1 : 0)).current;
  const opacAnim   = useRef(new Animated.Value(active ? 1 : 0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const glowAnim   = useRef(new Animated.Value(active ? 1 : 0)).current;
  const prevActive = useRef(active);

  useEffect(() => {
    Animated.spring(widthAnim, { toValue: active ? 1 : 0, tension: 320, friction: 28, useNativeDriver: false }).start();
    Animated.timing(opacAnim,  { toValue: active ? 1 : 0, duration: active ? 160 : 100, useNativeDriver: true }).start();
    if (active && !prevActive.current) {
      scaleAnim.setValue(0.88);
      Animated.spring(scaleAnim, { toValue: 1, tension: 450, friction: 22, useNativeDriver: true }).start();
      Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else if (!active) {
      Animated.timing(glowAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start();
    }
    prevActive.current = active;
  }, [active]);

  const handlePress = () => {
    scaleAnim.setValue(0.88);
    Animated.spring(scaleAnim, { toValue: 1, tension: 450, friction: 22, useNativeDriver: true }).start();
    onPress();
  };

  const labelWidth = widthAnim.interpolate({ inputRange:[0,1], outputRange:[0, 78] });

  return (
    <View style={{ overflow: 'visible', position: 'relative' }}>

      {/* Ambient glow disc */}
      <Animated.View pointerEvents="none" style={{
        position: 'absolute',
        top: -8, bottom: -8, left: -8, right: -8,
        borderRadius: 999,
        backgroundColor: theme.accent,
        opacity: glowAnim.interpolate({ inputRange:[0,1], outputRange:[0, 0.001] }),
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: d ? 0.60 : 0.38,
        shadowRadius: 12,
      }}>
        <Animated.View style={{
          position:'absolute', top:0, bottom:0, left:0, right:0,
          borderRadius: 999,
          backgroundColor: theme.accent,
          opacity: glowAnim.interpolate({ inputRange:[0,1], outputRange:[0, d ? 0.28 : 0.14] }),
        }} />
      </Animated.View>

      {/* Active pill */}
      <Animated.View style={[
        { transform: [{ scale: scaleAnim }] },
        active && {
          borderRadius: 999,
          shadowColor: theme.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: d ? 0.55 : 0.28,
          shadowRadius: 12,
        },
      ]}>
        <Pressable onPress={handlePress} style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          height: 48, paddingHorizontal: active ? 16 : 13,
          borderRadius: 999, gap: 7,
        }}>
          {/* Active pill surface — always a simple capsule; nesting LiquidGlassViews causes blur artifacts */}
          {active && (
            <View style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
              borderRadius: 999,
              backgroundColor: liquidGlass
                ? (d ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.62)')
                : (d ? theme.accentDim : theme.solid),
              borderWidth: liquidGlass ? 0 : 1.5,
              borderColor: d ? theme.accentMid : theme.accentBorder,
            }} />
          )}

          <View style={{ zIndex:1 }}>
            <item.Icon size={21} strokeWidth={active ? 2.5 : 2}
              color={active ? theme.accent : theme.muted} />
          </View>
          <Animated.View style={{ width: labelWidth, overflow:'hidden', zIndex:1 }}>
            <Animated.Text numberOfLines={1}
              style={{ fontSize:13.5, fontWeight:'700', color:theme.accent, opacity: opacAnim }}>
              {item.label}
            </Animated.Text>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function BottomNav({ tab, onChange, onFab }) {
  const { theme } = useApp();
  const d = theme.isDark;
  const liquidGlass = theme.liquidGlassOn && isLiquidGlassSupported && LiquidGlassView;
  const NavPill = liquidGlass ? LiquidGlassView : View;
  const Container = liquidGlass ? LiquidGlassContainerView : View;

  const fabScale = useRef(new Animated.Value(1)).current;
  const handleFab = () => {
    if (!onFab) return;
    fabScale.setValue(0.88);
    Animated.spring(fabScale, { toValue:1, tension:450, friction:22, useNativeDriver:true }).start();
    onFab();
  };

  return (
    <Container style={{
      position: 'absolute',
      bottom: 15,
      left: 16, right: 16,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      overflow: 'visible',
    }} pointerEvents="box-none">

      {/* ── Nav pill ── */}
      <NavPill style={{
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 8, paddingVertical: 7, gap: 2,
        overflow: 'visible',
        ...(!liquidGlass ? {
          shadowColor: theme.accent,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: d ? 0.28 : 0.16,
          shadowRadius: 14,
          elevation: 10,
        } : {}),
      }} {...(liquidGlass ? { colorScheme: d ? 'dark' : 'light' } : {})}>
        {/* Solid background — only when not using liquid glass */}
        {!liquidGlass && (
          <View style={{
            position: 'absolute', top:0, left:0, right:0, bottom:0,
            borderRadius: 999,
            backgroundColor: d ? theme.solid2 : theme.solid,
            borderWidth: 1,
            borderColor: d ? 'rgba(255,255,255,0.10)' : theme.border,
          }} />
        )}

        {TABS.map(item => (
          <NavBtn key={item.id} item={item} active={tab === item.id}
            onPress={() => onChange(item.id)} />
        ))}
      </NavPill>

      {/* ── FAB — only rendered when a handler is provided (LiquidGlassView native layer persists at opacity:0) ── */}
      {onFab ? (
        <View style={{ position:'relative', overflow:'visible' }}>
          {/* Glow halo */}
          <View pointerEvents="none" style={{
            position: 'absolute',
            top: -16, left: -16, right: -16, bottom: -16,
            borderRadius: 999,
            backgroundColor: theme.accent,
            opacity: 0.001,
            shadowColor: theme.accent,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: d ? 0.70 : 0.48,
            shadowRadius: 22,
          }} />
          <Animated.View style={{ transform:[{ scale: fabScale }] }}>
            {liquidGlass ? (
              <LiquidGlassView style={{ width: 58, height: 58, borderRadius: 29 }}
                tintColor={theme.accent} colorScheme={d ? 'dark' : 'light'}>
                <Pressable onPress={handleFab} style={{
                  width: '100%', height: '100%',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Plus size={26} strokeWidth={2.5} color="#fff" />
                </Pressable>
              </LiquidGlassView>
            ) : (
              <Pressable onPress={handleFab} style={{
                width: 58, height: 58, borderRadius: 29,
                overflow: 'hidden',
                backgroundColor: theme.accent,
                borderWidth: 1,
                borderColor: d ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.45)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Plus size={26} strokeWidth={2.5} color="#fff" />
              </Pressable>
            )}
          </Animated.View>
        </View>
      ) : (
        <View style={{ width: 58, height: 58 }} />
      )}
    </Container>
  );
}
