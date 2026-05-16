import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Home, BarChart3, Settings, Plus } from '../components/Icon.js';
import { useApp } from '../context/AppContext.js';

const TABS = [
  { id:'home',     label:'Habits',    Icon:Home      },
  { id:'insights', label:'Analytics', Icon:BarChart3  },
  { id:'settings', label:'Settings',  Icon:Settings   },
];

function NavBtn({ item, active, onPress }) {
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

  return (
    // overflow:visible so the external glow halo isn't clipped
    <View style={{ overflow: 'visible', position: 'relative' }}>

      {/* ── Glow halo — sits OUTSIDE the pill's overflow:hidden ── */}
      {/* Uses near-zero backgroundColor so iOS shadow engine renders it circular */}
      <Animated.View pointerEvents="none" style={{
        position: 'absolute',
        // Larger than the pill so glow blooms beyond its edges
        top: -6, bottom: -6, left: -6, right: -6,
        borderRadius: 999,
        // Near-invisible fill — REQUIRED for iOS to cast circular shadow
        backgroundColor: theme.accent,
        opacity: glowAnim.interpolate({ inputRange:[0,1], outputRange:[0, 0.001] }),
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 0,
      }}>
        {/* Animate the glow intensity via a second inner View */}
        <Animated.View style={{
          ...{ position:'absolute', top:0, bottom:0, left:0, right:0,
            borderRadius: 999,
            backgroundColor: theme.accent,
          },
          opacity: glowAnim.interpolate({ inputRange:[0,1], outputRange:[0, d ? 0.22 : 0.12] }),
        }} />
      </Animated.View>

      {/* ── Pill ── */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable onPress={handlePress} style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          height: 48, paddingHorizontal: active ? 16 : 13,
          borderRadius: 999, gap: 7,
        }}>
          {/* Active pill glass surface — overflow:hidden clips blur to circle */}
          {active && (
            <View style={{
              position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
              borderRadius: 999, overflow: 'hidden',
              borderWidth: 1,
              borderColor: d ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.90)',
            }}>
              <BlurView intensity={d ? 24 : 18} tint={d ? 'dark' : 'light'}
                style={{ position:'absolute', top:0, left:0, right:0, bottom:0,
                  borderRadius:999,
                  backgroundColor: d ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.82)' }} />
              <LinearGradient
                colors={[d ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.95)', 'rgba(0,0,0,0)']}
                start={{ x:0, y:0 }} end={{ x:0, y:1 }} locations={[0,1]}
                style={{ position:'absolute', top:0, left:0, right:0, height:2,
                  borderTopLeftRadius:999, borderTopRightRadius:999 }}
                pointerEvents="none" />
            </View>
          )}

          <View style={{ zIndex:1 }}>
            <item.Icon size={21} strokeWidth={active ? 2.5 : 2}
              color={active ? theme.accent : theme.muted} />
          </View>
          <Animated.View style={{ width: labelWidth, overflow:'hidden', zIndex:1 }}>
            <Animated.Text numberOfLines={1}
              style={{ fontSize:13.5, fontWeight:'600', color:theme.accent, opacity: opacAnim }}>
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
  // Remove safe area — user wants nav at fixed 15px from device bottom
  const d = theme.isDark;

  const fabScale = useRef(new Animated.Value(1)).current;
  const handleFab = () => {
    if (!onFab) return;
    fabScale.setValue(0.88);
    Animated.spring(fabScale, { toValue:1, tension:450, friction:22, useNativeDriver:true }).start();
    onFab();
  };

  return (
    <View style={{
      position: 'absolute',
      bottom: 15,       // 15px from device bottom — no safe area offset
      left: 16, right: 16,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      overflow: 'visible',
    }} pointerEvents="box-none">

      {/* ── Nav pill ─────────────────────────────────────────────────────── */}
      {/*
        Two-shell approach:
        - Outer shell: overflow:visible — allows NavBtn glows to escape
        - Inner glass shell: overflow:hidden — clips BlurView to the circle shape
        Both share the same borderRadius:999.
      */}
      <View style={{
        // Outer: manages layout and drop-shadow
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 999,
        paddingHorizontal: 8, paddingVertical: 7, gap: 2,
        shadowColor: '#000',
        shadowOffset: { width:0, height:8 },
        shadowOpacity: 0.20, shadowRadius: 20, elevation: 12,
        overflow: 'visible',   // ← allows NavBtn glow to escape
      }}>

        {/* Inner glass shell: overflow:hidden clips blur + bevel to circle */}
        <View style={{
          position: 'absolute', top:0, left:0, right:0, bottom:0,
          borderRadius: 999,
          overflow: 'hidden',     // ← clips BlurView; prevents rectangle
          borderWidth: 1,
          borderColor: d ? 'rgba(255,255,255,0.16)' : theme.navBorder,
        }}>
          <BlurView intensity={d ? 22 : 15} tint={d ? 'dark' : 'light'}
            style={{ position:'absolute', top:0, left:0, right:0, bottom:0,
              borderRadius:999, backgroundColor: theme.navBg }} />
          <LinearGradient
            colors={[d ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.86)', 'rgba(0,0,0,0)']}
            start={{ x:0, y:0 }} end={{ x:0, y:1 }} locations={[0,1]}
            style={{ position:'absolute', top:0, left:0, right:0, height:2,
              borderTopLeftRadius:999, borderTopRightRadius:999, opacity:0.90 }}
            pointerEvents="none" />
        </View>

        {/* Tab buttons — rendered above the inner shell */}
        {TABS.map(item => (
          <NavBtn key={item.id} item={item} active={tab === item.id}
            onPress={() => onChange(item.id)} />
        ))}
      </View>

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      {/*
        Glow: separate absolutely-positioned View BEHIND the FAB.
        This avoids needing Animated.View to cast shadows.
        FAB Pressable has overflow:hidden for clean circle clipping.
        Tactile: solid accent bg (not blurred) so it feels physical.
      */}
      <View style={{ position:'relative', overflow:'visible' }}>
        {/* Glow halo — behind FAB, circular */}
        {onFab && (
          <View pointerEvents="none" style={{
            position: 'absolute',
            top: -8, left: -8, right: -8, bottom: -8,
            borderRadius: 999,
            backgroundColor: theme.accent,
            opacity: d ? 0.15 : 0.08,
            shadowColor: theme.accent,
            shadowOffset: { width:0, height:0 },
            shadowOpacity: 0.45,
            shadowRadius: 8,
            elevation: 0,
          }} />
        )}

        <Animated.View style={{ transform:[{ scale: fabScale }],
          opacity: onFab ? 1 : 0 }}
          pointerEvents={onFab ? 'auto' : 'none'}>
          <Pressable onPress={handleFab} style={{
            width: 58, height: 58, borderRadius: 29,
            overflow: 'hidden',
            // Solid accent — no blur (avoids rectangle artefact), clean physical button
            backgroundColor: theme.accent,
            borderWidth: 1,
            borderColor: d ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)',
          }}>
            {/* Single top bevel stripe — same as active nav pill */}
            <LinearGradient
              colors={[d ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.90)', 'rgba(0,0,0,0)']}
              start={{ x:0, y:0 }} end={{ x:0, y:1 }} locations={[0,1]}
              style={{ position:'absolute', top:0, left:0, right:0, height:2.5,
                borderTopLeftRadius:29, borderTopRightRadius:29 }}
              pointerEvents="none" />
            <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
              <Plus size={26} strokeWidth={2.5} color="#fff" />
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
