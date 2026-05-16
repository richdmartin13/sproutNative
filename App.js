import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StatusBar, Pressable, useWindowDimensions, Animated } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_500Medium_Italic,
} from '@expo-google-fonts/playfair-display';
import { DMMono_300Light, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { Home, BarChart3, Settings, Plus } from './src/components/Icon.js';

import { AppProvider, useApp } from './src/context/AppContext.js';
import HomeScreen      from './src/screens/HomeScreen.js';
import TapScreen       from './src/screens/TapScreen.js';
import AnalyticsScreen from './src/screens/AnalyticsScreen.js';
import SettingsScreen  from './src/screens/SettingsScreen.js';
import BottomNav       from './src/components/BottomNav.js';
import HabitSheet      from './src/sheets/HabitSheet.js';
import LogSheet        from './src/sheets/LogSheet.js';

// Re-export FONTS from lib/fonts.js so existing imports don't break
export { FONTS } from './src/lib/fonts.js';
import { FONTS } from './src/lib/fonts.js';

const SIDE_TABS = [
  { id:'home',     label:'Habits',    Icon:Home      },
  { id:'insights', label:'Analytics', Icon:BarChart3  },
  { id:'settings', label:'Settings',  Icon:Settings  },
];

// Tablet side nav — mirrors web .side-nav exactly
function SideNav({ tab, onChange, onNewHabit }) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      width:220, backgroundColor:theme.navBg,
      borderRightWidth:1, borderRightColor:theme.navBorder,
      paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8,
      paddingHorizontal:12, gap:2,
    }}>
      {/* Logo */}
      <View style={{ flexDirection:'row', alignItems:'center', gap:10,
        paddingHorizontal:8, paddingVertical:14, marginBottom:8 }}>
        <View style={{ width:34, height:34, borderRadius:10, backgroundColor:theme.grad[1],
          alignItems:'center', justifyContent:'center',
          shadowColor:theme.accent, shadowOffset:{width:0,height:4},
          shadowOpacity:0.40, shadowRadius:8, elevation:6 }}>
          <Text style={{ fontSize:18 }}>🌱</Text>
        </View>
        <Text style={{ fontSize:20, fontWeight:'700', color:theme.text,
          fontFamily:FONTS.heading, letterSpacing:-0.02 }}>Sprout</Text>
      </View>
      {/* Nav buttons */}
      {SIDE_TABS.map(({id,label,Icon})=>{
        const active = tab===id;
        return (
          <Pressable key={id} onPress={()=>onChange(id)}
            style={({pressed})=>({
              flexDirection:'row', alignItems:'center', gap:10,
              paddingHorizontal:12, paddingVertical:10, borderRadius:12,
              backgroundColor: active?theme.navActive:'transparent',
              opacity:pressed?0.8:1,
            })}>
            <Icon size={20} strokeWidth={active?2.5:2} color={active?theme.accent:theme.muted} />
            <Text style={{ fontSize:14, fontWeight:active?'650':'500',
              color:active?theme.accent:theme.muted }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
      {/* New Habit button */}
      <Pressable onPress={onNewHabit}
        style={({pressed})=>({
          flexDirection:'row', alignItems:'center', gap:10,
          paddingHorizontal:12, paddingVertical:11, borderRadius:12,
          backgroundColor:theme.accent, marginTop:8,
          opacity:pressed?0.85:1,
          shadowColor:theme.accent, shadowOffset:{width:0,height:4},
          shadowOpacity:0.35, shadowRadius:10, elevation:6,
        })}>
        <Plus size={20} strokeWidth={2.5} color="#fff" />
        <Text style={{ fontSize:14, fontWeight:'650', color:'#fff' }}>New Habit</Text>
      </Pressable>
    </View>
  );
}

// Screen transition: pure cross-dissolve, 90ms.
// No scale — avoids visual weight / artifacts.
// opacity 0.4 → 1.0 (never full black, no blink frame ever).
function AnimatedScreen({ screenKey, children }) {
  const opacity = React.useRef(new Animated.Value(1)).current;
  const prevKey = React.useRef(null);

  React.useEffect(() => {
    if (prevKey.current === null) { prevKey.current = screenKey; return; }
    prevKey.current = screenKey;
    opacity.setValue(0.40);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  }, [screenKey]);

  return (
    <Animated.View style={{ flex:1, opacity }}>
      {children}
    </Animated.View>
  );
}

function Main() {
  const { data, theme, ready, upsertHabit, deleteHabit, addLog, updateLog, deleteLog } = useApp();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [tab,   setTab]   = useState('home');
  const [hid,   setHid]   = useState(null);
  const [back,  setBack]  = useState('home');
  const [sheet, setSheet] = useState(null);

  const habits = data?.habits ?? [];
  const prefs  = data?.prefs  ?? {};

  const goBack = useCallback(()=>{ setHid(null); setTab(b=>b==='tap'?(back||'home'):b); },[back]);
  const goTab  = useCallback(t=>{ setTab(t); if(t!=='tap') setHid(null); },[]);
  const openH  = useCallback(h=>{ setBack(tab); setHid(h.id); setTab('tap'); },[tab]);
  const onLog  = useCallback((id,log)=>{ addLog(id,log); return log; },[addLog]);
  const onDel  = useCallback((id,lid)=>deleteLog(id,lid),[deleteLog]);

  const onOptions = useCallback(h=>{
    Alert.alert(h.name,'What would you like to do?',[
      {text:'Edit',onPress:()=>setSheet({kind:'habit',habit:h})},
      {text:'Delete',style:'destructive',onPress:()=>Alert.alert('Delete habit',`Permanently delete "${h.name}" and all its logs?`,[
        {text:'Cancel',style:'cancel'},
        {text:'Delete',style:'destructive',onPress:()=>{ deleteHabit(h.id); goBack(); }},
      ])},
      {text:'Cancel',style:'cancel'},
    ]);
  },[deleteHabit,goBack]);

  const openNewHabit = useCallback(()=>setSheet({kind:'habit',habit:null}),[]);

  useEffect(()=>{
    if(tab==='tap'&&hid&&!habits.find(h=>h.id===hid)){ setHid(null); setTab(back||'home'); }
  },[tab,hid,habits,back]);

  if (!ready) return (
    <View style={{ flex:1, backgroundColor:'#09100c', alignItems:'center', justifyContent:'center', gap:16 }}>
      <View style={{ width:80, height:80, borderRadius:20, backgroundColor:'#1a4a2e',
        alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:36 }}>🌱</Text>
      </View>
      <ActivityIndicator color="#2d6e47" />
    </View>
  );

  const habit = hid ? habits.find(h=>h.id===hid) : null;
  const habitWithPrefs = habit ? { ...habit, _track:prefs.track??{} } : null;

  let screen;
  if (tab==='tap'&&habitWithPrefs) {
    screen = <TapScreen habit={habitWithPrefs} habits={habits} onBack={goBack}
      onLog={onLog} onEditLog={(h,l)=>setSheet({kind:'log',habit:h,log:l})}
      onDeleteLog={onDel} onOptions={()=>onOptions(habitWithPrefs)} />;
  } else if (tab==='insights') {
    screen = <AnalyticsScreen />;
  } else if (tab==='settings') {
    screen = <SettingsScreen />;
  } else {
    screen = <HomeScreen onOpenHabit={openH} onLongPressHabit={onOptions}
      onNewHabit={openNewHabit} />;
  }

  return (
    <View style={{ flex:1, backgroundColor:theme.bg, flexDirection: isTablet?'row':'column' }}>
      <StatusBar barStyle={theme.isDark?'light-content':'dark-content'} backgroundColor={theme.bg} />

      {/* Tablet: side nav */}
      {isTablet && tab!=='tap' && (
        <SideNav tab={tab} onChange={goTab} onNewHabit={openNewHabit} />
      )}

      {/* Main content */}
      <View style={{ flex:1 }}>
        <AnimatedScreen screenKey={tab+(hid||'')}>{screen}</AnimatedScreen>
        {/* Mobile: bottom nav. Tablet: no bottom nav (use side nav) */}
        {tab!=='tap' && !isTablet && (
          <BottomNav tab={tab} onChange={goTab}
            onFab={tab==='home'?openNewHabit:undefined} />
        )}
      </View>

      {sheet?.kind==='habit' && (
        <HabitSheet habit={sheet.habit} allHabits={habits}
          onClose={()=>setSheet(null)}
          onSave={next=>{ upsertHabit(next); setSheet(null); }} />
      )}
      {sheet?.kind==='log'&&sheet.habit&&sheet.log && (
        <LogSheet habit={habits.find(h=>h.id===sheet.habit.id)??sheet.habit} log={sheet.log} allHabits={habits}
          onClose={()=>setSheet(null)}
          onSave={next=>{ updateLog(sheet.habit.id,next); setSheet(null); }} />
      )}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold, PlayfairDisplay_500Medium, PlayfairDisplay_500Medium_Italic,
    DMMono_300Light, DMMono_400Regular, DMMono_500Medium,
  });
  if (!fontsLoaded) return <View style={{ flex:1, backgroundColor:'#09100c' }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Main />
      </AppProvider>
    </SafeAreaProvider>
  );
}
