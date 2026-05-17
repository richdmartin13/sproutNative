import React, {
  useState, useCallback, useEffect, useRef, useMemo,
  createContext, useContext,
} from 'react';
import {
  View, Text, Animated, Pressable,
  ActivityIndicator, StatusBar, useWindowDimensions,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApp } from '../context/AppContext.js';
import HomeScreen    from '../screens/HomeScreen.js';
import TapScreen     from '../screens/TapScreen.js';
import AnalyticsScreen from '../screens/AnalyticsScreen.js';
import SettingsScreen  from '../screens/SettingsScreen.js';
import BottomNav     from '../components/BottomNav.js';
import AppModal      from '../components/AppModal.js';
import HabitSheet    from '../sheets/HabitSheet.js';
import LogSheet      from '../sheets/LogSheet.js';
import Sheet         from '../sheets/Sheet.js';
import { Home, BarChart3, Settings, Plus } from '../components/Icon.js';
import { FONTS } from '../lib/fonts.js';

const Stack = createNativeStackNavigator();

// Passes sheet/options callbacks into stack screen components without prop drilling
const NavCtx = createContext(null);

// ─── Tablet side nav ─────────────────────────────────────────────────────────
const SIDE_TABS = [
  { id:'home',     label:'Habits',    Icon:Home      },
  { id:'insights', label:'Analytics', Icon:BarChart3  },
  { id:'settings', label:'Settings',  Icon:Settings   },
];

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

      {SIDE_TABS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <Pressable key={id} onPress={() => onChange(id)}
            style={({ pressed }) => ({
              flexDirection:'row', alignItems:'center', gap:10,
              paddingHorizontal:12, paddingVertical:10, borderRadius:12,
              backgroundColor: active ? theme.navActive : 'transparent',
              opacity: pressed ? 0.8 : 1,
            })}>
            <Icon size={20} strokeWidth={active ? 2.5 : 2} color={active ? theme.accent : theme.muted} />
            <Text style={{ fontSize:14, fontWeight:active ? '650' : '500',
              color: active ? theme.accent : theme.muted }}>
              {label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable onPress={onNewHabit}
        style={({ pressed }) => ({
          flexDirection:'row', alignItems:'center', gap:10,
          paddingHorizontal:12, paddingVertical:11, borderRadius:12,
          backgroundColor:theme.accent, marginTop:8,
          opacity: pressed ? 0.85 : 1,
          shadowColor:theme.accent, shadowOffset:{width:0,height:4},
          shadowOpacity:0.35, shadowRadius:10, elevation:6,
        })}>
        <Plus size={20} strokeWidth={2.5} color="#fff" />
        <Text style={{ fontSize:14, fontWeight:'650', color:'#fff' }}>New Habit</Text>
      </Pressable>
    </View>
  );
}

// ─── Screen transition ────────────────────────────────────────────────────────
// Cross-dissolve, 90ms (skipped when reducedMotion is on)
function AnimatedScreen({ screenKey, children }) {
  const { data } = useApp();
  const duration = data?.prefs?.dev?.reducedMotion ? 0 : 90;
  const opacity  = useRef(new Animated.Value(1)).current;
  const prevKey  = useRef(null);
  useEffect(() => {
    if (prevKey.current === null) { prevKey.current = screenKey; return; }
    prevKey.current = screenKey;
    opacity.setValue(0.40);
    Animated.timing(opacity, { toValue:1, duration, useNativeDriver:true }).start();
  }, [screenKey]);
  return <Animated.View style={{ flex:1, opacity }}>{children}</Animated.View>;
}

// ─── Home stack screens ───────────────────────────────────────────────────────
function HomeScreenWrapper({ navigation }) {
  const ctx = useContext(NavCtx);
  return (
    <HomeScreen
      onOpenHabit={h => navigation.navigate('Tap', { habitId: h.id })}
      onLongPressHabit={h => ctx.onOptions(h, () => {})}
      onNewHabit={ctx.openNewHabit}
    />
  );
}

function TapScreenWrapper({ navigation, route }) {
  const { habits, data, addLog, deleteLog } = useApp();
  const ctx    = useContext(NavCtx);
  const prefs  = data?.prefs  ?? {};
  const habitId = route.params?.habitId;
  const habit   = habits.find(h => h.id === habitId);

  useEffect(() => { if (!habit) navigation.goBack(); }, [habit]);
  if (!habit) return null;

  const habitWithPrefs = { ...habit, _track: prefs.track ?? {} };
  return (
    <TapScreen
      habit={habitWithPrefs}
      habits={habits}
      onBack={() => navigation.goBack()}
      onLog={(id, log) => { addLog(id, log); return log; }}
      onEditLog={(h, l) => ctx.setSheet({ kind:'log', habit:h, log:l })}
      onNewLog={(h, l) => ctx.setSheet({ kind:'log', habit:h, log:l, isNew:true })}
      onDeleteLog={(id, lid) => deleteLog(id, lid)}
      onOptions={() => ctx.onOptions(habitWithPrefs, () => navigation.goBack())}
    />
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown:false, gestureEnabled:true }}>
      <Stack.Screen name="HomeRoot" component={HomeScreenWrapper} />
      <Stack.Screen name="Tap"      component={TapScreenWrapper}
        options={{ animation:'default', gestureEnabled:true }} />
    </Stack.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function NativeNav() {
  const { habits, data, theme, ready, sysAlert, clearSysAlert, upsertHabit, deleteHabit, archiveHabit, addLog, updateLog, deleteLog } = useApp();
  const { width } = useWindowDimensions();
  const isTablet  = width >= 768;

  const [tab,          setTab]          = useState('home');
  const [sheet,        setSheet]        = useState(null);
  const [actionSheet,  setActionSheet]  = useState(null); // { habit, goBack }
  const [confirm,      setConfirm]      = useState(null); // { title, message, buttons }
  const [onTapScreen,  setOnTapScreen]  = useState(false);

  const openNewHabit = useCallback(() => setSheet({ kind:'habit', habit:null }), []);

  const onOptions = useCallback((h, goBack) => {
    setActionSheet({ habit: h, goBack });
  }, []);

  const handleNavStateChange = useCallback((state) => {
    if (!state) return;
    setOnTapScreen(state.routes[state.index]?.name === 'Tap');
  }, []);

  const navCtx = useMemo(
    () => ({ openNewHabit, setSheet, onOptions }),
    [openNewHabit, onOptions],
  );

  if (!ready) return (
    <View style={{ flex:1, backgroundColor:'#09100c', alignItems:'center', justifyContent:'center', gap:16 }}>
      <View style={{ width:80, height:80, borderRadius:20, backgroundColor:'#1a4a2e',
        alignItems:'center', justifyContent:'center' }}>
        <Text style={{ fontSize:36 }}>🌱</Text>
      </View>
      <ActivityIndicator color="#2d6e47" />
    </View>
  );

  // Hide bottom nav when drilling into a habit detail (TapScreen)
  const showBottomNav = !isTablet && !(tab === 'home' && onTapScreen);

  return (
    <NavCtx.Provider value={navCtx}>
      <View style={{ flex:1, backgroundColor:theme.bg, flexDirection: isTablet ? 'row' : 'column' }}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

        {isTablet && <SideNav tab={tab} onChange={setTab} onNewHabit={openNewHabit} />}

        <View style={{ flex:1 }}>
          {/* Home stack — always mounted so nav state survives tab switches */}
          <View style={{ flex:1, display: tab === 'home' ? 'flex' : 'none' }}>
            <NavigationContainer independent={true} onStateChange={handleNavStateChange}>
              <HomeStack />
            </NavigationContainer>
          </View>

          {tab === 'insights' && (
            <AnimatedScreen screenKey="insights"><AnalyticsScreen /></AnimatedScreen>
          )}
          {tab === 'settings' && (
            <AnimatedScreen screenKey="settings"><SettingsScreen /></AnimatedScreen>
          )}

          {showBottomNav && (
            <BottomNav tab={tab} onChange={t => { setTab(t); setSheet(null); }}
              onFab={tab === 'home' ? openNewHabit : undefined} />
          )}
        </View>

        {sheet?.kind === 'habit' && (
          <HabitSheet habit={sheet.habit} allHabits={habits}
            onClose={() => setSheet(null)}
            onSave={next => { upsertHabit(next); setSheet(null); }} />
        )}
        {sheet?.kind === 'log' && sheet.habit && sheet.log && (
          <LogSheet habit={habits.find(h => h.id === sheet.habit.id) ?? sheet.habit}
            log={sheet.log} allHabits={habits}
            onClose={() => setSheet(null)}
            onSave={next => {
              sheet.isNew ? addLog(sheet.habit.id, next) : updateLog(sheet.habit.id, next);
              setSheet(null);
            }} />
        )}

        {/* ── Habit action sheet ───────────────────────────────────────── */}
        {actionSheet && (() => {
          const d = theme.isDark;
          const pillBase = {
            borderRadius: 18, paddingVertical: 16, paddingHorizontal: 20,
            borderWidth: 1,
          };
          return (
            <Sheet title={actionSheet.habit.name} onClose={() => setActionSheet(null)}>
              <View style={{ gap: 10, paddingTop: 4 }}>
                <Pressable onPress={() => {
                  setActionSheet(null);
                  setSheet({ kind:'habit', habit:actionSheet.habit });
                }} style={({ pressed }) => ({
                  ...pillBase,
                  backgroundColor: d
                    ? pressed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'
                    : pressed ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
                  borderColor: d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)',
                })}>
                  <Text style={{ fontSize:16, fontWeight:'600', color:theme.text }}>Edit</Text>
                </Pressable>

                <Pressable onPress={() => {
                  const h = actionSheet.habit;
                  const gb = actionSheet.goBack;
                  setConfirm({
                    title: 'Archive habit',
                    message: `"${h.name}" will be hidden from your habits and excluded from stats. You can restore it later in Settings.`,
                    buttons: [
                      { text:'Cancel', style:'cancel', onPress:() => setConfirm(null) },
                      { text:'Archive', onPress:() => { archiveHabit(h.id); gb?.(); setConfirm(null); setActionSheet(null); } },
                    ],
                  });
                }} style={({ pressed }) => ({
                  ...pillBase,
                  backgroundColor: d
                    ? pressed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)'
                    : pressed ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
                  borderColor: d ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)',
                })}>
                  <Text style={{ fontSize:16, fontWeight:'600', color:theme.text }}>Archive</Text>
                </Pressable>

                <Pressable onPress={() => {
                  const h = actionSheet.habit;
                  const gb = actionSheet.goBack;
                  setConfirm({
                    title: 'Delete habit',
                    message: `Permanently delete "${h.name}" and all its logs?`,
                    buttons: [
                      { text:'Cancel', style:'cancel', onPress:() => setConfirm(null) },
                      { text:'Delete', style:'destructive', onPress:() => { deleteHabit(h.id); gb?.(); setConfirm(null); setActionSheet(null); } },
                    ],
                  });
                }} style={({ pressed }) => ({
                  ...pillBase,
                  backgroundColor: d
                    ? pressed ? theme.typeSt + '33' : theme.typeSt + '1A'
                    : pressed ? theme.typeSt + '28' : theme.typeSt + '14',
                  borderColor: theme.typeSt + '44',
                })}>
                  <Text style={{ fontSize:16, fontWeight:'600', color:theme.typeSt }}>Delete</Text>
                </Pressable>
              </View>
            </Sheet>
          );
        })()}

        {/* ── Confirm dialog (archive/delete habit) ───────────────────── */}
        <AppModal
          visible={!!confirm}
          title={confirm?.title}
          message={confirm?.message}
          buttons={confirm?.buttons ?? []}
          onDismiss={() => setConfirm(null)}
        />

        {/* ── System alert (Share Sheet import result) ─────────────────── */}
        <AppModal
          visible={!!sysAlert}
          title={sysAlert?.title}
          message={sysAlert?.message}
          buttons={[{ text:'OK', onPress: clearSysAlert }]}
          onDismiss={clearSysAlert}
        />
      </View>
    </NavCtx.Provider>
  );
}
