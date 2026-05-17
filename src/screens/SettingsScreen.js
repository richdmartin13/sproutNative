import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { ChevronRight, Download, Upload, Trash2, Palette, LayoutGrid, PenLine, BarChart3, Database, ScrollText, List, Grid, Clock, Undo2 } from '../components/Icon.js';
import { useApp } from '../context/AppContext.js';
import GlassCard from '../components/GlassCard.js';
import { SCHEMES } from '../lib/theme.js';
import { exportJson, importJson } from '../lib/storage.js';
import Sheet from '../sheets/Sheet.js';
import { Toggle } from '../components/Themed.js';
import { FONTS } from '../lib/fonts.js';

function MRow({ label, sub, value, onChange }) {
  const { theme } = useApp();
  return (
    <View style={{ flexDirection:'row', alignItems:'center', paddingVertical:13,
      borderBottomWidth:1, borderBottomColor:theme.border }}>
      <View style={{ flex:1, paddingRight:12 }}>
        <Text style={{ fontSize:15, fontWeight:'500', color:theme.text }}>{label}</Text>
        {sub ? <Text style={{ fontSize:11.5, color:theme.muted, marginTop:2 }}>{sub}</Text> : null}
      </View>
      <Toggle value={!!value} onChange={onChange} />
    </View>
  );
}

const APP_VERSION = '1.0.7';

const CHANGELOG = [
  {
    version: '1.0.7',
    changes: [
      'Watch: "Gave in" / "Resisted" buttons for stop habits — Resisted logs with resistance marker',
      'Watch: configurable auto-dismiss timing, haptic feedback, and stats display in Settings',
      'Archive: long-press any habit → Archive to hide from tracking; restore anytime in Settings',
      'Settings: About section with app info; Apple Watch settings section',
      'Modals: removed minimum height constraint — sheets now size to their content',
      'Tablet: 3-column grid layout on iPad',
      'Versioning: version now matches build number (1.0.7 = build 7)',
    ],
  },
  {
    version: '1.0.6',
    changes: [
      'Apple Watch: full-screen tap logs habit; Undo button appears post-log; auto-dismisses after 2s',
      'Apple Watch: Undo wired through native bridge — removes most recent today-log on iPhone',
      'Export filename: # replaced with . (fixes file import issues on some systems)',
      'Add Habit modal: type selector redesigned as compact inline row with icons',
      'Compact list cards: increased padding and category label for better readability',
      'Home & Analytics: spacing added below filter chips before first cards',
      'Build pipeline: Codemagic fully automated — sign, archive, export, TestFlight submit',
    ],
  },
  {
    version: 'sprout_2026.05.14.27',
    changes: [
      'Apple Watch app: full SwiftUI app (HabitListView, QuickLogView, HabitRowView, WatchDataModel)',
      'WatchConnectivity bridge: SproutWatchBridge native module pushes habits to watch via Application Context + direct message',
      'Watch log events: tapping "Log it" on watch creates a timestamped log entry in the iPhone app via WatchLog event',
      'useWatchSync hook: debounced 400ms push of compact habit snapshot whenever habits change in AppContext',
      'Config plugin fully handles Xcode project — no local Xcode needed; EAS builds the watch target automatically',
      'Plugin adds watch target, build phases, WatchKit.framework, Embed Watch Content phase, and WatchConnectivity entitlement',
      'WATCH_READY flag in plugins/withWatchApp.js — set to true after one browser step at developer.apple.com: create App ID sprout.richdmart.in.watchkitapp (no capabilities needed — WatchConnectivity is a plain framework, not an App ID capability)',
      'Bridge files always compiled in (regardless of WATCH_READY) so the main app build is never broken',
      'JSON import from Share Sheet: sharing any .json file to Sprout merges it into existing data (new habits added, missing logs backfilled, duplicates skipped)',
      'CFBundleDocumentTypes declared via config plugin so iOS routes shared JSON files to the app',
      'Linking handler in AppContext reads the shared file:// URL via expo-file-system and calls importJson on load',
    ],
  },
  {
    version: 'sprout_2026.05.14.26',
    changes: [
      'App icon fix: icon.png top half was nearly transparent (alpha ≈ 15), making the sprout logo hard to see — green background now fills the full 1024×1024 canvas via alpha-composite',
      'adaptive-icon.png: logo scaled up ~72% for better visual weight on Android adaptive icon safe zone',
      'AsyncStorage config plugin entry removed from app.json (package has no config plugin — caused PluginError on startup)',
      'Git long paths: core.longpaths = true applied globally to fix MAX_PATH build failures on Windows',
    ],
  },
  {
    version: 'sprout_2026.05.14.25',
    changes: [
      'Bundle ID renamed: com.sprout.app → sprout.richdmart.in (app.json iOS bundleIdentifier, Android package, Expo slug)',
      'eas.json created with development/preview/production build profiles',
      'AltStore fix: app.json AsyncStorage plugin config sets nextStorage:false to prevent App Groups container access on sideloaded builds',
      'AltStore fix: AppContext loadData retries after 200ms if storage unavailable on first sideload launch',
      'Title bar spacing: paddingBottom 10 → 16 on all 4 screens',
      'Deprecation sweep: no deprecated APIs, expo-file-system/legacy intentional for EncodingType.UTF8, all package versions consistent',
    ],
  },
  {
    version: 'sprout_2026.05.14.24',
    changes: [
      'EAS BUILD FIX: react-native-svg 15.11.2 → 15.12.1 — fixes C++ Fabric shadow node errors (BaseShadowNode, ConcreteShadowNode template arguments) that caused Xcode build failure in RN 0.76+',
      'react-native 0.81.4 → 0.81.5 — minor patch matching Expo SDK 54 expectation',
    ],
  },
  {
    version: 'sprout_2026.05.14.23',
    changes: [
      'CRITICAL FIX: useSafeAreaInsets hook was declared in sub-components (Filters, Section, LogRowNative, MRow) but used via insets.top in the main exported component — ReferenceError on all 4 screens',
      'FIXED: Hook moved to correct scope in HomeScreen, AnalyticsScreen, TapScreen, SettingsScreen',
      'FIXED: Stray <> fragments (no matching </>) removed from HomeScreen and AnalyticsScreen',
      'FIXED: BottomNav unused useSafeAreaInsets import removed',
      'Verified: all GlassCard open/close balanced, no require cycles, no empty imports, no SafeAreaView JSX',
    ],
  },
  {
    version: 'sprout_2026.05.14.22',
    changes: [
      'SafeAreaView removed entirely — replaced with useSafeAreaInsets() hook on all screens',
      'Topbar: paddingTop = insets.top + 10 on all screens (status bar safe without deprecated component)',
      'paddingBottom:10 on all topbars — consistent 20px visual gap to first content',
      'FAB: BlurView removed (caused rectangle blur artifact), solid accent + single top bevel stripe',
    ],
  },
  {
    version: 'sprout_2026.05.14.21',
    changes: [
      'Settings + TapScreen:(edges=top) added — content no longer overlaps status bar',
      'FAB: blur+bevel matching active nav pill (no sphere gradients), feels same as tab selector',
      'All circular glows unified to today-pill reference: shadowOpacity:0.45, shadowRadius:8',
      'FAB glow, nav active pill glow, active chips all use same glow values',
      'Header/content gap normalized across all screens',
    ],
  },
  {
    version: 'sprout_2026.05.14.20',
    changes: [
      'Nav: two-shell architecture — outer overflow:visible (glow escapes), inner overflow:hidden (clips blur to circle = no rectangle)',
      'Nav glow: near-zero opacity fill + animated inner View for subtle circular bloom',
      'FAB: solid accent colour (tactile/physical), bevel gradient for depth, separate glow halo View positioned behind',
      'Nav bottom: 15px fixed (no safe area offset)',
      'Home chips: now identical to Analytics chips (overflow:visible wrapper, glow, same padding)',
      'Header/content gap: 12/6 topbar padding across all screens; settings 12/10',
      ': react-native-safe-area-context in TapScreen and SettingsScreen',
      'Bug sweep: GlassCard balance verified, no require cycles, no stale refs',
    ],
  },
  {
    version: 'sprout_2026.05.14.19',
    changes: [
      'Glow: subtle (dark 0.28/0.45 shadow, light 0.14/0.22) on nav active pill and FAB; accent chips same subtle glow',
      'Nav pill glass reduced to 50% (BlurView intensity 22/15); active pill 50% (24/18)',
      'Nav glow: outer overflow:visible wrapper with shadow carrier View — no squaring',
      'Chip glow: overflow:visible parent wrapper so shadow is never clipped vertically',
      'Chips: unified component across Home and Analytics screens',
      'Compact card: two-row layout — name + today pill (row 1), badge + total (row 2)',
      'Colour swatches: full accent colour fill across entire rounded rect',
      'Settings title: 30px Playfair matching Habits/Analytics',
      'Header/content padding: all screens paddingTop:10 paddingBottom:8, filter bar 6px gap',
      'Data modal rows: paddingVertical 14px (less cramped)',
    ],
  },
  {
    version: 'sprout_2026.05.14.18',
    changes: [
      'Uniform header font: Habits/Analytics/Settings all 30px Playfair, letterSpacing -0.025',
      'Compact card: total count shown inline',
      'Consistent padding: all screens use 20px horizontal (matches topbar)',
      'Sheet: minHeight 60% screen height',
      'Colour scheme picker: single accent-colour dot in current dark/light mode with glow on selected',
      'Default view toggle: List/Grid icons added',
      'BottomNav active pill: no gradient sheen — blur + bevel only; glow on overflow:visible outer wrapper so it never clips',
      'BottomNav glow: animated opacity (in/out) on activation; also fires on tab change',
      'BottomNav pill + FAB: tap spring scale 0.88→1 via Animated.spring (tension 450, friction 22)',
      'Tap animation: press 0.93 in 45ms + spring 380/14 — snappier',
      'All glow elements use overflow:visible parent so shadow is never clipped',
    ],
  },
  {
    version: 'sprout_2026.05.14.17',
    changes: [
      'CRASH FIX: DayOfWeekSection reference error — stale call replaced with TimePatternsCard',
      'REQUIRE CYCLE FIX: FONTS moved to src/lib/fonts.js — no more App.js circular imports',
      'Package versions corrected: expo-linear-gradient ~15.0.8, expo-blur ~15.0.8, babel-preset-expo ~54.0.10',
      'Sheet modals: glass removed — flat solid background like action buttons',
      'Tap zone: flat with colored border + accent glow (no blur)',
      'Nav/FAB glass reduced to ~80% intensity (skeuomorphic)',
      'Screen titles 30px across all tabs; chip fonts 14px',
      'Stop habit cards: Clock icon + Nd counter instead of flame/free text',
      'Colored glows: habit accent stripes, active filter chips, today-pills, FAB',
      ': using react-native-safe-area-context (deprecation warning fixed)',
    ],
  },
  {
    version: 'sprout_2026.05.14.16',
    changes: [
      'Glass intensity: full (100%) on nav/FAB/sheets, softened (40%) on section/habit cards, flat (no blur) on interior components — stat counters, action buttons, log rows',
      'BottomNav: gradients removed, pure blur+bevel; bottom margin equals side margin (16px)',
      'Compact card mode: real compact layout (name + count + badge in one row, no sparks/meta)',
      'Days-since counter on stop habits in same badge position as streak on go/neutral habits',
      'Streak badge added to neutral habit cards',
      'Time categories section: time-of-day (Morning/Afternoon/Evening/Night) left column + day-of-week bars right column, side by side in one card',
      'Screen transition: 90ms pure cross-dissolve (opacity 0.40→1.0), no scale, no artifacts',
      'Font sizes increased across all screens: screen titles 28px, habit names 16.5px, section labels 14px, settings rows 15px',
    ],
  },
  {
    version: 'sprout_2026.05.14.15',
    changes: [
      'Liquid glass applied to ALL surfaces: stat cards, tap zone, action buttons, log rows, empty states, settings list, bottom sheet panel — via GlassCard (BlurView + sheen + inner bevel)',
      'GlassCard: stronger definition — bevel 2.5px, sheen opacity 0.60-0.70, blur intensity 55 dark/40 light, multi-edge border (bright top, dark bottom) for raised feel',
      'BottomNav: separate ActivePill component inside each tab button — glass blur + sheen + bevel + accent glow per active tab',
      'Screen transition: 110ms dissolve, spring tension 500/friction 38 — snaps in ~80ms, no blink, no overshoot',
    ],
  },
  {
    version: 'sprout_2026.05.14.14',
    changes: [
      'GlassCard: real frosted blur (expo-blur BlurView intensity=40) + LinearGradient sheen overlay — true liquid glass effect',
      'BottomNav pill: BlurView frosted glass base layer',
      'Screen transition: spring scale 0.965→1.0 with opacity starting at 0.25 (not 0) — eliminates the blink/flash between tabs',
    ],
  },
  {
    version: 'sprout_2026.05.14.13',
    changes: [
      'GlassCard: now uses expo-linear-gradient for true CSS-matching gradients (135° diagonal for cards, 180° top-fade for sections)',
      'BottomNav: LinearGradient glass overlay on pill (matches web .bnav::before), accent glow shadow on active tab pill (matches web .bnav button.on box-shadow: 0 2px 10px var(--accent-glow))',
      'expo-linear-gradient ~14.1.3 added (bundled in Expo Go)',
    ],
  },
  {
    version: 'sprout_2026.05.14.12',
    changes: [
      'Layout & Behavior modal now matches web exactly: order (Streak, Compact, Default view inline, Repeat, Carry, Auto-tag, Day view), subs match, Default view is an inline .seg control on the right',
      'Data modal matches web: icon inline in label row, chevron on right, no icon boxes',
      'GlassCard rewritten: highlight fills full width correctly; section variant uses top band, card variant uses diagonal top-left + bottom-right corners',
      'Stat cards in Analytics and TapScreen now use GlassCard for consistent glass look',
    ],
  },
  {
    version: 'sprout_2026.05.14.11',
    changes: [
      'Version dates corrected to 2026.05.14',
      'Native analytics parity with web: section headers with subtitles, "ALL TIME"/"THIS DAY" label, heatmap subtitle',
      'Native bottom nav: animated label expand/collapse with spring, glow on active tab — matches web .bnav',
      'Screen transitions: fade+slide with no flash on tab switch',
      'Web scroll restored (separate fix in web)',
    ],
  },
  {
    version: 'sprout_2026.05.14.10',
    changes: [
      'Settings toggles work: track prefs correctly gate fields and are respected on save',
      'All trackables for all habit types (no type gating)',
      'Analytics: single filter bar drives all sections',
      'Spider ease tab shows Resistance for stop habits',
      'Glass highlights on cards',
    ],
  },
  {
    version: 'sprout_2026.05.14.9',
    changes: [
      'Spider chart via react-native-svg (filled polygon, vertex dots) — identical to web',
      'Font rules matched to web: Playfair on screen titles / empty h3 / sheet h2 only',
      'Fixed: Analytics IconComp crash',
    ],
  },
  {
    version: 'sprout_2026.05.14.1–8',
    changes: [
      'Initial builds: brand guide, 7 schemes, all screens/sheets, analytics, settings',
      'Lucide icons (same as web), Playfair Display + DM Mono fonts',
      'Expo Go SDK 54 — React 19.1.0 + RN 0.81.4 + overrides for single React copy',
      'Import (expo-document-picker) / Export (expo-file-system/legacy) / Clear data',
      'Tablet side nav (≥768dp), matching web desktop layout',
    ],
  },
];
export default function SettingsScreen() {
  const { data, theme, setPrefs, setData, restoreHabit } = useApp();
  const insets = useSafeAreaInsets();
  const prefs = data?.prefs || {};
  const [modal, setModal] = useState(null);

  const setP = updates => setPrefs({ ...prefs, ...updates });

  // ── Export ──
  const doExport = async () => {
    try {
      const json = exportJson(data);
      const now = new Date();
      const p = n => String(n).padStart(2,'0');
      const filename = `sprout_v${APP_VERSION}_${now.getFullYear()}.${p(now.getMonth()+1)}.${p(now.getDate())}.json`;
      const path = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export Sprout data' });
      } else {
        Alert.alert('Export', 'Sharing is not available on this device.');
      }
    } catch (e) {
      Alert.alert('Export failed', String(e));
    }
  };

  // ── Import ──
  const doImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', 'public.json', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;
      const text = await FileSystem.readAsStringAsync(uri);
      const { data: next, summary } = importJson(text, data);
      setData(next);
      setModal(null);
      Alert.alert('Import complete', `${summary.newHabits} new habits, ${summary.newLogs} new logs added.`);
    } catch (e) {
      console.error('Import error:', e);
      Alert.alert('Import failed', `Could not parse file: ${String(e.message || e)}`);
    }
  };

  // ── Clear all ──
  const doClear = () => {
    setModal(null);
    Alert.alert(
      'Clear all data',
      'This will permanently delete all your habits and logs. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear everything', style: 'destructive',
          onPress: () => setData({ ...data, habits: [] }) },
      ]
    );
  };

  const GROUPS = [
    { id:'appearance', label:'Appearance',        sub:'Theme and accent color',          Icon:Palette },
    { id:'behavior',   label:'Layout & Behavior',  sub:'Card density, tap behavior',      Icon:LayoutGrid },
    { id:'fields',     label:'Logging Fields',     sub:'Which fields appear when logging', Icon:PenLine },
    { id:'sections',   label:'Analytics Sections', sub:'Which insights to show',          Icon:BarChart3 },
    { id:'watch',      label:'Apple Watch',        sub:'Dismiss timing, haptics, stats',  Icon:Clock },
    { id:'data',       label:'Data',               sub:'Backup, restore, and clear',      Icon:Database },
    { id:'changelog',  label:'Changelog',          sub:"What's new",                      Icon:ScrollText },
  ];

  const TRACKS   = [['mood','Mood'],['energy','Energy'],['ease','Ease (stars)'],['duration','Duration'],['resist','Resistance outcome'],['trigger','Trigger'],['context','Context'],['tags','Tags'],['notes','Notes']];
  const SECTIONS = [['heatmap','Heatmap'],['hourly','By Hour'],['trends','Last 30 Days'],['spider','Spider'],['rankings','Rankings'],['mood','Mood & Energy'],['time','Day of Week'],['tags','Tags'],['resist','Resistance']];

  return (
    <View style={{ flex:1, backgroundColor:theme.bg }}>
      <View style={{ paddingHorizontal:20, paddingTop:insets.top+10, paddingBottom:16 }}>
          <Text style={{ fontSize:30, fontWeight:'700', color:theme.text,
            fontFamily:FONTS.heading, letterSpacing:-0.025 }}>Settings</Text>
        </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal:20, paddingBottom:120 }}
        showsVerticalScrollIndicator={false}>
        <GlassCard style={{ marginBottom:16 }} radius={20} variant="section">
          <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
            textTransform:'uppercase', letterSpacing:0.8, padding:16, paddingBottom:10 }}>
            Preferences
          </Text>
          {GROUPS.map(({ id, label, sub, Icon }) => (
            <Pressable key={id} onPress={() => setModal(id)}
              style={({ pressed }) => ({
                flexDirection:'row', alignItems:'center', gap:12,
                paddingHorizontal:16, paddingVertical:14,
                borderTopWidth:1, borderTopColor:theme.border,
                backgroundColor: pressed ? theme.surface2 : 'transparent',
              })}>
              <View style={{ width:34, height:34, borderRadius:9,
                backgroundColor:theme.accentDim, alignItems:'center', justifyContent:'center' }}>
                <Icon size={17} strokeWidth={2} color={theme.accent} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontSize:15, fontWeight:'600', color:theme.text }}>{label}</Text>
                <Text style={{ fontSize:12, color:theme.muted, marginTop:1 }}>{sub}</Text>
              </View>
              <ChevronRight size={16} strokeWidth={2} color={theme.muted} />
            </Pressable>
          ))}
        </GlassCard>
        {/* ── Archived Habits ── */}
        {(data?.habits || []).some(h => h.archived) && (
          <GlassCard style={{ marginBottom:16 }} radius={20} variant="section">
            <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
              textTransform:'uppercase', letterSpacing:0.8, padding:16, paddingBottom:10 }}>
              Archived Habits
            </Text>
            {(data?.habits || []).filter(h => h.archived).map(h => (
              <View key={h.id} style={{ flexDirection:'row', alignItems:'center', gap:12,
                paddingHorizontal:16, paddingVertical:12,
                borderTopWidth:1, borderTopColor:theme.border }}>
                <View style={{ width:34, height:34, borderRadius:9,
                  backgroundColor:theme.surface2, alignItems:'center', justifyContent:'center' }}>
                  <Undo2 size={16} strokeWidth={2} color={theme.muted} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:15, fontWeight:'500', color:theme.text }}>{h.name}</Text>
                  {h.category ? <Text style={{ fontSize:12, color:theme.muted, marginTop:1 }}>{h.category}</Text> : null}
                </View>
                <Pressable onPress={() => restoreHabit(h.id)}
                  style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:10,
                    backgroundColor:theme.accentDim, borderWidth:1, borderColor:theme.accentBorder }}>
                  <Text style={{ fontSize:12, fontWeight:'600', color:theme.accent }}>Restore</Text>
                </Pressable>
              </View>
            ))}
          </GlassCard>
        )}

        {/* ── About ── */}
        <GlassCard style={{ marginBottom:8, padding:18 }} radius={20} variant="flat">
          <View style={{ flexDirection:'row', alignItems:'center', gap:14, marginBottom:12 }}>
            <View style={{ width:46, height:46, borderRadius:13,
              backgroundColor: theme.isDark ? '#1a4a2e' : '#d4edda',
              alignItems:'center', justifyContent:'center',
              shadowColor:theme.accent, shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:8 }}>
              <Text style={{ fontSize:24 }}>🌱</Text>
            </View>
            <View>
              <Text style={{ fontSize:17, fontWeight:'700', color:theme.text, fontFamily:FONTS.heading }}>Sprout</Text>
              <Text style={{ fontSize:12, color:theme.muted, marginTop:2 }}>Version {APP_VERSION} (build 7)</Text>
            </View>
          </View>
          <Text style={{ fontSize:13, color:theme.muted, lineHeight:19 }}>
            A lightweight habit tracker for iOS and Apple Watch. All data lives on your device — no accounts, no servers.
          </Text>
        </GlassCard>

        <Text style={{ fontSize:11, color:theme.muted, textAlign:'center', marginBottom:24, marginTop:8 }}>
          richdmart.in
        </Text>
      </ScrollView>

      {/* ── Appearance Modal ── */}
      {modal === 'appearance' && (
        <Sheet title="Appearance" onClose={() => setModal(null)}>
          <MRow label="Dark mode" sub={prefs.dark ? 'On' : 'Off'}
            value={prefs.dark} onChange={v => setP({ dark: v })} />
          <View style={{ paddingVertical:14 }}>
            <View style={{ marginBottom:10 }}>
              <Text style={{ fontSize:14, fontWeight:'600', color:theme.text }}>Color scheme</Text>
              <Text style={{ fontSize:12, color:theme.muted, marginTop:2 }}>
                {SCHEMES[prefs.scheme]?.label || 'Sprout'}
              </Text>
            </View>
            {/* Swatch row — single accent colour in current mode */}
            <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
              {Object.entries(SCHEMES).map(([key, sc]) => {
                const isActive = prefs.scheme === key;
                const accentCol = sc.accent;
                return (
                  // Outer wrapper overflow:visible so glow doesn't clip
                  <View key={key} style={{ flex:1, minWidth:40, overflow:'visible' }}>
                    <Pressable onPress={() => setP({ scheme: key })}
                      title={sc.label}
                      style={({ pressed }) => ({
                        height:42, borderRadius:13,
                        // Full accent fill — matches app colour in current mode
                        backgroundColor: accentCol,
                        borderWidth: isActive ? 2.5 : 1.5,
                        borderColor: isActive ? theme.text : 'transparent',
                        // Glow
                        shadowColor: accentCol,
                        shadowOffset:{width:0,height:0},
                        shadowOpacity: isActive ? (theme.isDark?0.70:0.40) : 0,
                        shadowRadius: isActive ? 12 : 0,
                        elevation: isActive ? 6 : 0,
                        transform:[{scale: pressed?0.94:isActive?1.05:1}],
                      })} />
                  </View>
                );
              })}
            </View>
          </View>
        </Sheet>
      )}

      {/* ── Behavior Modal ── */}
      {modal === 'behavior' && (
        <Sheet title="Layout & Behavior" onClose={() => setModal(null)}>
          <MRow label="Streak badges" sub="Show streak (start/neutral) or days-since (stop)"
            value={prefs.showStreak} onChange={v => setP({ showStreak: v })} />
          <MRow label="Compact cards" sub="Tighter padding on habit cards"
            value={prefs.compact} onChange={v => setP({ compact: v })} />
          {/* Default view — label+sub on left, seg control on right, matches web MRow */}
          <View style={{ flexDirection:'row', alignItems:'center', gap:10,
            paddingVertical:10, borderBottomWidth:1, borderBottomColor:theme.border }}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'500', color:theme.text }}>Default view</Text>
              <Text style={{ fontSize:11.5, color:theme.muted, marginTop:1 }}>Habits list shape on launch</Text>
            </View>
            {/* Inline .seg control */}
            <View style={{ flexDirection:'row', backgroundColor:theme.surface2,
              borderWidth:1, borderColor:theme.border, borderRadius:10,
              padding:2, gap:1 }}>
              {[['list', List, 'List'], ['grid', Grid, 'Grid']].map(([v, IconComp, lbl]) => (
                <Pressable key={v} onPress={() => setP({ viewMode: v })}
                  style={{ flexDirection:'row', alignItems:'center', gap:5,
                    paddingHorizontal:12, paddingVertical:7, borderRadius:8,
                    backgroundColor:prefs.viewMode===v ? theme.solid : 'transparent' }}>
                  <IconComp size={14} strokeWidth={2}
                    color={prefs.viewMode===v ? theme.text : theme.muted} />
                  <Text style={{ fontSize:12, fontWeight:'600',
                    color: prefs.viewMode===v ? theme.text : theme.muted }}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <MRow label="Repeat last by default" sub="Auto-fill most recent log's details on tap"
            value={prefs.repeatLastDefault} onChange={v => setP({ repeatLastDefault: v })} />
          <MRow label="Carry last mood & energy" sub="Copy mood and energy from your most recent log, even without full repeat"
            value={prefs.repeatLastMoodEnergy} onChange={v => setP({ repeatLastMoodEnergy: v })} />
          <MRow label="Auto-tag recent habits" sub="Automatically add habits logged in the last 5 minutes as tags"
            value={prefs.autoTagRecentHabits} onChange={v => setP({ autoTagRecentHabits: v })} />
          <MRow label="Open analytics in Day view" sub="Analytics defaults to Day instead of All-time"
            value={prefs.insDay} onChange={v => setP({ insDay: v })} />
        </Sheet>
      )}

      {/* ── Watch Modal ── */}
      {modal === 'watch' && (
        <Sheet title="Apple Watch" onClose={() => setModal(null)}>
          <View style={{ paddingVertical:14, borderBottomWidth:1, borderBottomColor:theme.border }}>
            <Text style={{ fontSize:15, fontWeight:'500', color:theme.text, marginBottom:3 }}>Auto-dismiss after logging</Text>
            <Text style={{ fontSize:11.5, color:theme.muted, marginBottom:12 }}>How long to show the confirmation before closing</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              {[[1,'1s'],[2,'2s'],[5,'5s'],[0,'Never']].map(([val, label]) => {
                const active = (prefs.watchDismiss ?? 2) === val;
                return (
                  <Pressable key={val} onPress={() => setP({ watchDismiss: val })}
                    style={{ flex:1, paddingVertical:9, borderRadius:11, alignItems:'center',
                      backgroundColor: active ? theme.accent : theme.surface2,
                      borderWidth:1.5, borderColor: active ? theme.accent : theme.border }}>
                    <Text style={{ fontSize:13, fontWeight:'600', color: active ? '#fff' : theme.text }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <MRow label="Haptic feedback" sub="Vibrate on log, resist, and undo"
            value={prefs.watchHaptic !== false} onChange={v => setP({ watchHaptic: v })} />
          <MRow label="Show stats" sub="Display streak and today count on watch"
            value={prefs.watchShowStats !== false} onChange={v => setP({ watchShowStats: v })} />
        </Sheet>
      )}

      {/* ── Logging Fields Modal ── */}
      {modal === 'fields' && (
        <Sheet title="Logging Fields" onClose={() => setModal(null)}>
          {TRACKS.map(([k, l]) => (
            <MRow key={k} label={l}
              value={prefs.track?.[k] !== false}
              onChange={() => setPrefs({ ...prefs, track: { ...prefs.track, [k]: !prefs.track?.[k] } })} />
          ))}
        </Sheet>
      )}

      {/* ── Analytics Sections Modal ── */}
      {modal === 'sections' && (
        <Sheet title="Analytics Sections" onClose={() => setModal(null)}>
          {SECTIONS.map(([k, l]) => (
            <MRow key={k} label={l}
              value={prefs.sections?.[k] !== false}
              onChange={() => setPrefs({ ...prefs, sections: { ...prefs.sections, [k]: !prefs.sections?.[k] } })} />
          ))}
        </Sheet>
      )}

      {/* ── Data Modal ── */}
      {modal === 'data' && (
        <Sheet title="Data" onClose={() => setModal(null)}>
          {/* Matches web: settings-modal-row with icon inline in label */}
          <Pressable onPress={doExport}
            style={({ pressed }) => ({
              flexDirection:'row', alignItems:'center', gap:10,
              paddingVertical:14, borderBottomWidth:1, borderBottomColor:theme.border,
              opacity: pressed ? 0.7 : 1,
            })}>
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:7, marginBottom:1 }}>
                <Download size={15} strokeWidth={2} color={theme.accent} />
                <Text style={{ fontSize:15, fontWeight:'500', color:theme.text }}>Export</Text>
              </View>
              <Text style={{ fontSize:12.5, color:theme.muted }}>Save a JSON backup of your habits & logs</Text>
            </View>
            <ChevronRight size={16} strokeWidth={2} color={theme.muted} />
          </Pressable>

          <Pressable onPress={doImport}
            style={({ pressed }) => ({
              flexDirection:'row', alignItems:'center', gap:10,
              paddingVertical:14, borderBottomWidth:1, borderBottomColor:theme.border,
              opacity: pressed ? 0.7 : 1,
            })}>
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:7, marginBottom:1 }}>
                <Upload size={15} strokeWidth={2} color={theme.accent} />
                <Text style={{ fontSize:15, fontWeight:'500', color:theme.text }}>Import</Text>
              </View>
              <Text style={{ fontSize:12.5, color:theme.muted }}>Merge habits & logs from a JSON file</Text>
            </View>
            <ChevronRight size={16} strokeWidth={2} color={theme.muted} />
          </Pressable>

          <Pressable onPress={doClear}
            style={({ pressed }) => ({
              flexDirection:'row', alignItems:'center', gap:10,
              paddingVertical:14,
              opacity: pressed ? 0.7 : 1,
            })}>
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:7, marginBottom:1 }}>
                <Trash2 size={15} strokeWidth={2} color={theme.typeSt} />
                <Text style={{ fontSize:14, fontWeight:'500', color:theme.typeSt }}>Clear all data</Text>
              </View>
              <Text style={{ fontSize:12.5, color:theme.muted }}>Permanently delete every habit and log</Text>
            </View>
            <ChevronRight size={16} strokeWidth={2} color={theme.muted} />
          </Pressable>
        </Sheet>
      )}

      {/* ── Changelog Modal ── */}
      {modal === 'changelog' && (
        <Sheet title="Changelog" onClose={() => setModal(null)}>
          {CHANGELOG.map(b => (
            <View key={b.version} style={{ marginBottom:20 }}>
              <Text style={{ fontSize:12, fontWeight:'700', color:theme.accent,
                marginBottom:8, fontFamily:FONTS.mono }}>{b.version}</Text>
              {b.changes.map((c, i) => (
                <Text key={i} style={{ fontSize:12.5, color:theme.text2, lineHeight:20,
                  paddingLeft:10, marginBottom:4 }}>· {c}</Text>
              ))}
            </View>
          ))}
        </Sheet>
      )}
    </View>
  );
}
