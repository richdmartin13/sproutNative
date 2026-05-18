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

function NavBtn({ item, active, onPress, liquidGlass }) {
  const { theme } = useApp();
  const d = theme.isDark;

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

  // Active icon/text color: light-mode glass needs dark text (white washes out on light glass)
  const activeTextColor = (liquidGlass && !d) ? theme.text : '#fff';
  const inactiveTextColor = theme.muted;

  return (
    <View style={{ overflow: 'visible', position: 'relative' }}>

      {/* Ambient glow disc — only when active */}
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

      {/* Pill wrapper — spring scale + drop shadow when active */}
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

          {/* Active indicator — LiquidGlassView in glass mode (parent is plain View, no nesting)
              or solid accent fill in non-glass mode */}
          {active && (
            liquidGlass ? (
              <LiquidGlassView
                style={{ position:'absolute', top:0, bottom:0, left:0, right:0, borderRadius:999 }}
                tintColor={theme.accent}
                colorScheme={d ? 'dark' : 'light'}
                pointerEvents="none"
              />
            ) : (
              <View style={{
                position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
                borderRadius: 999,
                backgroundColor: d ? theme.accentMid : theme.accent,
                borderWidth: 1,
                borderColor: d ? theme.accentBorder : 'rgba(255,255,255,0.30)',
              }} />
            )
          )}

          <View style={{ zIndex:1 }}>
            <item.Icon size={21} strokeWidth={active ? 2.5 : 2}
              color={active ? activeTextColor : inactiveTextColor} />
          </View>
          <Animated.View style={{ width: labelWidth, overflow:'hidden', zIndex:1 }}>
            <Animated.Text numberOfLines={1}
              style={{ fontSize:13.5, fontWeight:'700', color: activeTextColor, opacity: opacAnim }}>
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

  // When glass is on, the nav pill is a plain View (so active LG indicators don't nest inside another LG)
  // When glass is off, the nav pill keeps its solid background
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
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 8, paddingVertical: 7, gap: 2,
        overflow: 'visible',
        // In glass mode: dark translucent background (no glass blur — prevents nesting artifact)
        // In non-glass mode: solid surface with shadow
        ...(liquidGlass ? {
          backgroundColor: d ? 'rgba(30,30,30,0.55)' : 'rgba(255,255,255,0.72)',
          borderWidth: 1,
          borderColor: d ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        } : {
          shadowColor: theme.accent,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: d ? 0.28 : 0.16,
          shadowRadius: 14,
          elevation: 10,
        }),
      }}>
        {/* Solid background for non-glass mode */}
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
            onPress={() => onChange(item.id)} liquidGlass={!!liquidGlass} />
        ))}
      </View>

      {/* ── FAB — only rendered when a handler is provided ── */}
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
