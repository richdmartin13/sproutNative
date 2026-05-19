import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { ChevronRight, Download, Upload, Trash2, Palette, LayoutGrid, PenLine, BarChart3, Database, ScrollText, List, Grid, Clock, Undo2, Archive, FlaskConical, Home, Settings, GripVertical, Tag, Plus, X } from '../components/Icon.js';
import { DraggableList } from '../components/DraggableList.js';
import { useApp } from '../context/AppContext.js';
import { useTutorial } from '../context/TutorialContext.js';
import { onWatchReachability } from '../watch/WatchBridge.js';
import GlassCard from '../components/GlassCard.js';
import AppModal from '../components/AppModal.js';
import { SCHEMES } from '../lib/theme.js';
import { exportJson, importJson } from '../lib/storage.js';
import { isCatVisible, fmtHour } from '../lib/util.js';
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

const APP_VERSION = '1.0.36';
const APP_BUILD  = 36;

const CHANGELOG = [
  {
    version: '1.0.36',
    changes: [
      'Settings tour (Guided Tours → Settings): tutorial now starts only after the About modal fully closes — no longer fires while the sheet is still animating out',
      'Build fix: react-native-worklets added as required companion for react-native-reanimated v4',
    ],
  },
  {
    version: '1.0.35',
    changes: [
      'Drag-to-reorder: replaced custom PanResponder with react-native-draggable-flatlist — drag initiates from the grip handle only',
      'Sort: selector is inline (text left, options right) with short labels that fit without wrapping',
      'Time Gates: Edit and Add Gate are styled buttons at the bottom; Edit mode stages changes; Save commits them',
      'Time Gates: gate editors (hours, mode) only visible in Edit mode; normal view is read-only',
      'Settings tour: retriggerable from About → Guided Tours without leaving the Settings screen',
    ],
  },
  {
    version: '1.0.34',
    changes: [
      'Time Gates: single Add Gate button with category picker; Edit mode to delete gates; category enabled by presence of gates (no toggle)',
      'Settings: Sort selector full-width below its label — matches Display section style',
      'Alert modals: solid card background always present behind liquid glass — consistent on all devices',
      'Drag-to-reorder: measurement captured at drag-start (not layout-time) — fixes wrong item index when dragging after sheet animation',
      'Watch: habit row and grid tile cards use glass material background for a more polished look',
    ],
  },
  {
    version: '1.0.33',
    changes: [
      'Settings: Categories section replaced with Time Gates — enable gates per category, set Available or Unavailable windows, stack multiple gates',
      'Settings: Drag-to-reorder fixed — Fields and Sections modals render without a parent ScrollView so dragging never fights scrolling',
      'Watch: archived and time-gated habits are now excluded from the watch app habit list',
      'Tutorial: Settings tour added — walks through Appearance, Layout, Fields, Time Gates, Analytics, and Data on first visit',
      'Tutorial: Home filters step updated to mention time-gated category chips',
    ],
  },
  {
    version: '1.0.32',
    changes: [
      'Settings: Sort moved into Display section as a compact inline selector matching the list/grid toggle',
      'Settings: Logging Fields and Analytics Sections — grip handle moved to left, toggle moved to right, standard Toggle replaces circle checkbox',
      'Settings: ScrollView locks during drag-to-reorder so the sheet doesn\'t scroll while moving items',
      'Watch: category filter button matches settings button exactly — plain white icon, same style',
      'Watch: list layout button no longer loses its icon when selected — fixed SF Symbol fill variant',
    ],
  },
  {
    version: '1.0.31',
    changes: [
      'Settings crash fix: TRACKS constant moved to module scope — eliminated TDZ ReferenceError when opening Settings',
      'Sheets: swipe down on the handle or header to dismiss',
      'Watch: category filter button now has accent-color circle background with white icon — visually distinct from settings button',
      'Categories: can now be individually hidden/shown; optional time gate restricts visibility to a chosen time window',
    ],
  },
  {
    version: '1.0.30',
    changes: [
      'Watch: filter toolbar icon always white to match settings button; filled variant signals active category',
      'Settings: Logging Fields and Analytics Sections unified — identical single-row design with circle toggle and drag handle',
      'Settings: both lists support drag-to-reorder; logging field order persisted in prefs',
      'Settings: removed separate Reorder Sections sub-modal — drag inline instead',
      'Settings: no per-type chips in the main list — cleaner, less cluttered',
    ],
  },
  {
    version: '1.0.29',
    changes: [
      'Watch: category filter icon now correctly stays visible and accent-tinted when a filter is active (uses .tint on watchOS toolbar button)',
      'Watch: category section removed from gear settings — filter is only accessible via the dedicated toolbar button',
      'Settings: all modals now use consistent section headers (DISPLAY, SORT, LOGGING, ANALYTICS, ACCENT COLOR)',
      'Settings: Logging Fields redesigned to match Analytics Sections — tap-to-toggle circle indicators, shown/hidden grouping, type chips inline when active',
      'Settings: Behavior modal reorganized into four logical groups',
      'Settings: Apple Watch modal gets a DISPLAY section header; label copy tightened throughout',
      'Settings: Appearance modal accent color section uses header + current scheme name inline',
    ],
  },
  {
    version: '1.0.28',
    changes: [
      'Watch: category filter gets its own toolbar button — tap the filter icon to narrow habits by category, persists until cleared',
      'Watch: active category shown as an inline chip with × clear button directly on the habit list',
      'Watch: all settings now bidirectionally synced — changes made on iPhone mirror to watch and vice versa instantly',
      'Watch: settings panel (⚙ icon) contains all display options: layout, haptic, auto-dismiss, show stats, show category',
      'Watch: selected category resets automatically if the filtered category is removed from your habits',
      'Settings: Apple Watch modal cleaned up — shorter labels, sync note added to connection row',
    ],
  },
  {
    version: '1.0.27',
    changes: [
      'Alert dialogs: all confirmations (clear data, delete, archive) now use the in-app styled modal — consistent background and animations everywhere',
      'Alert fix: sheets close before showing confirmation modal, eliminating the iOS two-Modal freeze',
      'Watch: category filter — new settings panel on watch (single gear icon replaces two toolbar buttons)',
      'Watch: settings panel has grid/list toggle, sync button, and category chips',
      'Watch: active category shown with dismiss button inline in the list; empty-category state with clear filter option',
      'Watch: categories list derived from active habits and sent with watchPrefs from iPhone',
    ],
  },
  {
    version: '1.0.26',
    changes: [
      'CRASH FIX: all delete/archive confirmations now use system Alert.alert — eliminates freeze caused by two stacked React Native Modals on iOS',
      'Quick log: new Behavior setting — tap card = instant log, long-press = open detail screen',
      'Archived Habits always visible in settings; tapping when empty shows a brief hint instead of opening a modal',
      'Clear all data: fixed stale-closure bug (uses functional state update now)',
      'Watch: connection status indicator in Apple Watch settings (Connected / Out of range)',
      'Watch: refresh icon on watch explained in settings — it manually syncs the latest data from iPhone',
      'Watch: Show category toggle — display category label on watch habit cards',
      'Watch: showCategory pref sent to watch and respected by HabitRowView and HabitGridTile',
      'Dev: Card Shadows setting removed (was outdated)',
    ],
  },
  {
    version: '1.0.25',
    changes: [
      'Tutorials: home tour rewritten — describes filters, habit form, and tap screen accurately',
      'Tutorials: analytics tour rewritten — only describes what exists (daily/all-time, 30-day and hourly ranges)',
      'Tutorials: settings tour removed',
      'Guided Tours moved into the About modal; no longer a top-level settings section',
      'Guided Tours: Reset all tours button added',
      'Tutorial: open_new_habit and habit_saved action hooks wired in NativeNav',
    ],
  },
  {
    version: '1.0.20',
    changes: [
      'Watch: toolbar buttons use .tint(.white) to override accent tint — icons render as clear white symbols',
      'Filter chips: Start/Stop/Neutral now all selected on launch (initialized to all three)',
      'Logging Fields: per-type selectors — each field shows Start/Stop/Neutral chips to control which habit types include it',
      'Analytics: Resistance section now renders (was missing from DEFAULT_SECTION_ORDER and renderSection)',
      'Analytics: Resistance section shows segmented bar per stop habit with Resisted/Partial/Gave In breakdown',
    ],
  },
  {
    version: '1.0.19',
    changes: [
      'Watch: toolbar icons (grid/list, refresh) now render correctly — .foregroundStyle(.primary) overrides accent tint fill',
      'Settings: Developer mode toggle moved to About section — 7 taps reveals it; toggling off hides the dev panel',
      'Settings: removed the separate "Disable Developer Options" button (About toggle replaces it)',
      'iPad: side nav refreshed — app icon branding, accent-tinted active items, tighter spacing matching phone design',
    ],
  },
  {
    version: '1.0.18',
    changes: [
      'Filter chips: deselecting the last type chip is a no-op — at least one must remain selected',
      'Nav: active tab text and icon use dark color in light mode (white was unreadable on light glass)',
      'Watch: toolbar buttons (grid/list toggle, refresh) restored to bare Image(systemName:) — no modifiers that suppress rendering on watchOS',
    ],
  },
  {
    version: '1.0.17',
    changes: [
      'Nav: active tab now uses a liquid glass indicator with accent tint — visible without blur artifacts',
      'Dev: Glass Chips toggle — glass chips on by default; can be disabled per-device in Developer settings',
      'Dev: test dataset overhauled — Drink Water (×4–8/day), Eat a Meal (×1–3/day), Reading (1–2 sessions/day)',
      'Dev: test dataset adds 3 neutral habits: Daily Stretch, Weight Check, Mood Check-in',
      'Dev: Watch taps in test mode now use ephemeral state — changes reset when test mode is toggled off',
      'Watch: list rows now match grid tile style — colored background, count, dot indicator',
      'Watch: toolbar icons fixed with explicit font sizing',
      'Context: theme now computed before useWatchSync call (TDZ crash fix for build 17+)',
    ],
  },
  {
    version: '1.0.15',
    changes: [
      'Nav: active tab selector no longer creates a blurry blob — uses a clean frosted capsule inside the glass pill',
      'FAB: glass circle no longer ghosts when the button is hidden',
      'Settings: Developer Options disable button now reliably persists via functional state update',
      'Splash screen now waits for both fonts and data to finish loading before hiding',
      'Watch: list rows redesigned as cards with left-edge type-color accent bar',
      'Watch: toolbar icons (grid/list toggle, refresh) now render correctly',
    ],
  },
  {
    version: '1.0.14',
    changes: [
      'Liquid Glass enabled by default on devices that support it (iOS 26+ native builds)',
      'Liquid Glass can now be disabled in Developer → Liquid Glass toggle',
    ],
  },
  {
    version: '1.0.13',
    changes: [
      'Liquid Glass: cards and nav correctly appear dark in dark mode (colorScheme prop wired up)',
      'Liquid Glass: filter chips, type chips, and Day/All selector now use liquid glass with accent tinting',
      'Liquid Glass: FAB is now accent-tinted, nav active tab has a glassy liquid glass selector',
      'Liquid Glass: modals and bottom sheets use glass surface with correct light/dark tinting',
      'Liquid Glass: LiquidGlassContainerView wraps nav+FAB so elements interact as connected glass',
      'Theme: app now follows device light/dark mode by default (toggle "Follow device" in Appearance)',
      'Watch: accent color and dark/light mode synced from iPhone settings — watch matches app branding',
      'Watch: list row style fixed — no more excessive rounding or misalignment',
      'Watch: hourly sparkline always visible; fades in from placeholder when data arrives',
      'Watch: Apple Watch section hidden on iPad (not applicable)',
    ],
  },
  {
    version: '1.0.12',
    changes: [
      'Watch: grid view toggle — show habits in a 2-column layout on Apple Watch',
      'Watch: hourly activity sparkline — 24-bar chart of today\'s logs at the top of the watch list',
      'Watch: Siri Shortcut — "Open Sprout" shortcut for watch face complications and Siri',
      'Dev: Liquid Glass toggle now correctly applies @callstack/liquid-glass on iOS 26+ native builds',
    ],
  },
  {
    version: '1.0.11',
    changes: [
      'Design: removed catch-light (1px top border artifact) from all cards, modals, and FAB',
      'Design: accent stripes on habit cards now always glow regardless of shadow settings',
      'Design: active filter chips now always glow — solid-fill colored elements glow unconditionally',
      'Design: modal and sheet shadows changed to neutral black (no longer accent-colored)',
      'Design: modal action buttons (confirm/destructive) now always glow',
      'Design: selector active state border softened to 0.5px tactile raise instead of 1px outline',
      'Analytics: Day/All toggle is now icon-only, matches Grid/List selector style exactly',
      'Analytics: All-time icon changed from Σ to ∞ (Infinity)',
      'Dev: Liquid Glass toggle in Developer settings — activates @callstack/liquid-glass on cards, nav, and FAB on iOS 26+ native builds',
    ],
  },
  {
    version: '1.0.10',
    changes: [
      'Tap: fixed phantom log bug — "Log with Details" no longer pre-creates a log; cancelling the edit sheet leaves no orphan entry',
      'Nav: removed gray top line from bottom nav in light mode (now uses near-white border, matching the cards fix from 1.0.9)',
      'Settings: Archived Habits moved to its own modal (appears in Preferences when at least one habit is archived)',
    ],
  },
  {
    version: '1.0.9',
    changes: [
      'Glass: reverted to original background opacity; removed gray hairline from top of light-mode cards (transparent top border)',
      'Log: stop habits now always show a resistance pill — "Resisted", "Partial", or "Gave In" — on every log entry',
      'Analytics: resistance rate now correctly counts watch-logged "Resisted" taps; spider Resistance chart works',
      'Watch: "Resisted" from watch now stores as canonical resist=yes, counting correctly in all analytics',
    ],
  },
  {
    version: '1.0.8',
    changes: [
      'Watch: stop habits now show two explicit buttons — "Gave In" and "Resisted" — tapping the frame still defaults to Gave In',
      'Settings: About section now shows the actual app icon instead of an emoji',
      'Settings: Export icon is now Upload (↑), Import icon is now Download (↓)',
      'Light mode: Liquid Glass cards now let the warm background bleed through — reduced surface opacity, higher blur intensity, lower sheen veil',
    ],
  },
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

const SECTIONS = [
  ['heatmap','Heatmap'],
  ['hourly','By Hour'],
  ['trends','Last 30 Days'],
  ['spider','Spider'],
  ['rankings','Rankings'],
  ['correlations','Patterns'],
  ['mood','Mood & Energy'],
  ['time','Day of Week'],
  ['tags','Tags'],
  ['resist','Resistance'],
];
const SECTIONS_MAP           = Object.fromEntries(SECTIONS.map(([k,l]) => [k,l]));
const DEFAULT_SECTIONS_ORDER = SECTIONS.map(([k]) => k);

const TRACKS = [['mood','Mood'],['energy','Energy'],['ease','Ease (stars)'],['duration','Duration'],['resist','Resistance outcome'],['trigger','Trigger'],['context','Context'],['tags','Tags'],['notes','Notes']];
const DEFAULT_FIELDS_ORDER = TRACKS.map(([k]) => k);

function TimeGatesModal({ data, prefs, setPrefs, theme, onClose }) {
  const d = theme.isDark;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);       // staged changes while editing
  const [pickingCat, setPickingCat] = useState(false);

  const allCats = useMemo(
    () => [...new Set((data?.habits || []).map(h => h.category).filter(Boolean))].sort(),
    [data],
  );

  const liveGates = prefs.timeGates || {};
  const gates = editing ? (draft ?? liveGates) : liveGates;
  const catsWithGates = allCats.filter(cat => (gates[cat]?.gates || []).length > 0);

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(liveGates)));
    setEditing(true);
  };

  const saveEdit = () => {
    setPrefs({ ...prefs, timeGates: draft ?? liveGates });
    setEditing(false);
    setDraft(null);
  };

  // Add gate: always live (not staged), shown outside edit mode
  const addGate = cat => {
    const existing = liveGates[cat]?.gates || [];
    const id = String(Date.now());
    setPrefs({
      ...prefs,
      timeGates: { ...liveGates, [cat]: { gates: [...existing, { id, startH: 6, endH: 10, mode: 'available' }] } },
    });
    setPickingCat(false);
  };

  // Edit-mode mutations go to draft
  const updateGate = (cat, id, updates) => {
    const existing = gates[cat]?.gates || [];
    setDraft({ ...gates, [cat]: { gates: existing.map(g => g.id === id ? { ...g, ...updates } : g) } });
  };

  const deleteGate = (cat, id) => {
    const existing = gates[cat]?.gates || [];
    const remaining = existing.filter(g => g.id !== id);
    const next = { ...gates };
    if (remaining.length === 0) { delete next[cat]; } else { next[cat] = { gates: remaining }; }
    setDraft(next);
  };

  const HourPicker = ({ cat, gate, field, def }) => {
    const val = gate[field] ?? def;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.surface2, borderRadius: 9, borderWidth: 1, borderColor: theme.border }}>
        <Pressable onPress={() => updateGate(cat, gate.id, { [field]: Math.max(0, val - 1) })}
          hitSlop={6} style={{ paddingVertical: 7, paddingHorizontal: 11 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>−</Text>
        </Pressable>
        <Text style={{ minWidth: 52, textAlign: 'center', fontSize: 12, fontWeight: '600', color: theme.text }}>
          {fmtHour(val)}
        </Text>
        <Pressable onPress={() => updateGate(cat, gate.id, { [field]: Math.min(23, val + 1) })}
          hitSlop={6} style={{ paddingVertical: 7, paddingHorizontal: 11 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>+</Text>
        </Pressable>
      </View>
    );
  };

  const btnBase = ({ pressed, accent }) => ({
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 13, borderRadius: 14,
    borderWidth: 1,
    borderColor: accent ? theme.accent : theme.border,
    backgroundColor: accent
      ? pressed ? theme.accent : theme.accentDim
      : pressed ? theme.surface2 : 'transparent',
  });

  return (
    <Sheet
      title={pickingCat ? 'Add Gate' : 'Time Gates'}
      subtitle={pickingCat ? 'Choose a category' : 'Schedule when categories appear'}
      onClose={onClose}
    >
      {/* ── Category picker ── */}
      {pickingCat ? (
        <>
          {allCats.map(cat => (
            <Pressable key={cat} onPress={() => addGate(cat)}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', paddingVertical: 15,
                borderBottomWidth: 1, borderBottomColor: theme.border,
                backgroundColor: pressed ? theme.surface2 : 'transparent',
              })}>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.text }}>{cat}</Text>
              <ChevronRight size={16} strokeWidth={2} color={theme.muted} />
            </Pressable>
          ))}
          <Pressable onPress={() => setPickingCat(false)}
            style={({ pressed }) => ({
              marginTop: 16, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
              backgroundColor: pressed ? theme.surface2 : 'transparent',
              borderWidth: 1, borderColor: theme.border,
            })}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.muted }}>Cancel</Text>
          </Pressable>
        </>
      ) : allCats.length === 0 ? (
        <Text style={{ fontSize: 14, color: theme.muted, textAlign: 'center', paddingVertical: 32 }}>
          No categories yet. Add one to a habit to get started.
        </Text>
      ) : (
        <>
          {catsWithGates.length === 0 && !editing && (
            <Text style={{ fontSize: 13, color: theme.muted, paddingBottom: 16, lineHeight: 19 }}>
              No gates yet. Tap Add Gate to schedule when a category appears or is hidden.
            </Text>
          )}

          {/* ── Gate list grouped by category ── */}
          {catsWithGates.map(cat => {
            const catGates = gates[cat]?.gates || [];
            return (
              <View key={cat}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.muted,
                  textTransform: 'uppercase', letterSpacing: 0.7, paddingTop: 16, paddingBottom: 4 }}>
                  {cat}
                </Text>
                {catGates.map((gate, gi) => (
                  <View key={gate.id} style={{ borderTopWidth: gi > 0 ? 1 : 0, borderTopColor: theme.border }}>
                    {/* Summary row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 }}>
                      {editing && (
                        <Pressable onPress={() => deleteGate(cat, gate.id)} hitSlop={8}>
                          <View style={{ width: 22, height: 22, borderRadius: 11,
                            backgroundColor: theme.typeSt, alignItems: 'center', justifyContent: 'center' }}>
                            <X size={12} strokeWidth={2.5} color="#fff" />
                          </View>
                        </Pressable>
                      )}
                      <Text style={{ flex: 1, fontSize: 14, color: theme.text2 }}>
                        {fmtHour(gate.startH ?? 6)} → {fmtHour(gate.endH ?? 10)}
                      </Text>
                      <View style={{
                        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                        backgroundColor: gate.mode === 'available'
                          ? theme.accentDim
                          : d ? 'rgba(255,90,90,0.15)' : 'rgba(200,40,40,0.10)',
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600',
                          color: gate.mode === 'available' ? theme.accent : theme.typeSt }}>
                          {gate.mode === 'available' ? 'Available' : 'Unavailable'}
                        </Text>
                      </View>
                    </View>
                    {/* Inline editor — only in edit mode */}
                    {editing && (
                      <View style={{ paddingBottom: 14, gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 11, color: theme.muted, width: 28 }}>From</Text>
                          <HourPicker cat={cat} gate={gate} field="startH" def={6} />
                          <Text style={{ fontSize: 11, color: theme.muted }}>to</Text>
                          <HourPicker cat={cat} gate={gate} field="endH" def={10} />
                        </View>
                        <View style={{ flexDirection: 'row', backgroundColor: theme.surface2,
                          borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 2, gap: 1 }}>
                          {[['available', 'Available'], ['unavailable', 'Unavailable']].map(([mode, lbl]) => (
                            <Pressable key={mode}
                              onPress={() => updateGate(cat, gate.id, { mode })}
                              style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8,
                                backgroundColor: gate.mode === mode ? theme.solid : 'transparent' }}>
                              <Text style={{ fontSize: 12, fontWeight: '600',
                                color: gate.mode === mode ? theme.text : theme.muted }}>{lbl}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          })}

          {/* ── Bottom action buttons ── */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            {editing ? (
              <Pressable onPress={saveEdit}
                style={({ pressed }) => btnBase({ pressed, accent: true })}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.accent }}>Save</Text>
              </Pressable>
            ) : (
              <>
                {catsWithGates.length > 0 && (
                  <Pressable onPress={startEdit}
                    style={({ pressed }) => btnBase({ pressed, accent: false })}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>Edit</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setPickingCat(true)}
                  style={({ pressed }) => btnBase({ pressed, accent: true })}>
                  <Plus size={15} strokeWidth={2.5} color={theme.accent} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: theme.accent }}>Add Gate</Text>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}
    </Sheet>
  );
}

export default function SettingsScreen({ onNavigate }) {
  const { data, theme, setPrefs, setData, restoreHabit, deleteHabit } = useApp();
  const { startTutorial } = useTutorial();
  const insets = useSafeAreaInsets();
  const prefs  = data?.prefs || {};
  const [modal,    setModal]   = useState(null);
  const [tapHint,  setTapHint] = useState('');
  const [settAlert,       setSettAlert]    = useState(null); // { title, message, buttons }
  const [pendingTutorial, setPendingTutorial] = useState(null);

  const tapRef   = useRef(0);
  const timerRef = useRef(null);
  const [listHint,      setListHint]      = useState('');
  const [watchReachable, setWatchReachable] = useState(null); // null=unknown, true/false

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    return onWatchReachability(r => setWatchReachable(r));
  }, []);

  // Fire pending tutorial only after the About modal has fully closed
  useEffect(() => {
    if (!pendingTutorial || modal !== null) return;
    const id = pendingTutorial;
    setPendingTutorial(null);
    const t = setTimeout(() => {
      startTutorial(id, () =>
        setPrefs({ ...prefs, tutorialSeen: { ...(prefs.tutorialSeen || {}), [id]: true } })
      );
    }, 300);
    return () => clearTimeout(t);
  }, [pendingTutorial, modal]); // eslint-disable-line react-hooks/exhaustive-deps

  const setP   = updates => setPrefs({ ...prefs, ...updates });
  const setDev = updates => setPrefs({ ...prefs, dev: { ...prefs.dev, ...updates } });

  // 7-tap dev unlock — placed on version text in About modal
  const handleVersionTap = () => {
    if (prefs.devUnlocked) return; // already on; toggle in About controls it
    tapRef.current += 1;
    clearTimeout(timerRef.current);
    const n = tapRef.current;
    if (n >= 7) {
      tapRef.current = 0;
      setTapHint('Developer mode enabled');
      setPrefs({ ...prefs, devUnlocked: true });
      timerRef.current = setTimeout(() => setTapHint(''), 2000);
      return;
    }
    if (n >= 3) setTapHint(`${7 - n} more tap${7 - n !== 1 ? 's' : ''} to unlock developer mode`);
    timerRef.current = setTimeout(() => { tapRef.current = 0; setTapHint(''); }, 2000);
  };

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
        setSettAlert({ title:'Export', message:'Sharing is not available on this device.', buttons:[{ text:'OK', onPress:()=>setSettAlert(null) }] });
      }
    } catch (e) {
      setSettAlert({ title:'Export failed', message:String(e), buttons:[{ text:'OK', onPress:()=>setSettAlert(null) }] });
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
      setSettAlert({ title:'Import complete', message:`${summary.newHabits} new habits, ${summary.newLogs} new logs added.`, buttons:[{ text:'OK', onPress:()=>setSettAlert(null) }] });
    } catch (e) {
      console.error('Import error:', e);
      setSettAlert({ title:'Import failed', message:`Could not parse file: ${String(e.message || e)}`, buttons:[{ text:'OK', onPress:()=>setSettAlert(null) }] });
    }
  };

  // ── Clear all ──
  const doClear = () => {
    setModal(null);
    setTimeout(() => {
      setSettAlert({
        title: 'Clear all data',
        message: 'This will permanently delete all your habits and logs. This cannot be undone.',
        buttons: [
          { text: 'Cancel', style: 'cancel', onPress: () => setSettAlert(null) },
          { text: 'Clear everything', style: 'destructive', onPress: () => { setData(d => ({ ...d, habits: [] })); setSettAlert(null); } },
        ],
      });
    }, 350);
  };

  // ── Analytics section order ──
  const sectionsOrder = prefs.sectionsOrder || DEFAULT_SECTIONS_ORDER;

  // ── Logging fields order ──
  const fieldsOrder   = prefs.fieldsOrder || DEFAULT_FIELDS_ORDER;
  const orderedTracks = fieldsOrder.map(k => TRACKS.find(([tk]) => tk === k)).filter(Boolean);

  const archivedHabits = (data?.habits || []).filter(h => h.archived);

  const GROUPS = [
    { id:'appearance', label:'Appearance',         sub:'Theme and accent color',              Icon:Palette },
    { id:'behavior',   label:'Layout & Behavior',  sub:'Card density, sort, tap behavior',    Icon:LayoutGrid },
    { id:'fields',     label:'Logging Fields',     sub:'Which fields appear when logging',    Icon:PenLine },
    { id:'timegates',  label:'Time Gates',          sub:'Schedule when categories appear',     Icon:Clock },
    { id:'sections',   label:'Analytics Sections', sub:'Which insights to show and their order', Icon:BarChart3 },
    ...(!Platform.isPad ? [{ id:'watch', label:'Apple Watch', sub:'Dismiss timing, haptics, connection', Icon:Clock }] : []),
    { id:'archived', label:'Archived Habits',
      sub: archivedHabits.length ? `${archivedHabits.length} hidden habit${archivedHabits.length !== 1 ? 's' : ''}` : 'None',
      Icon:Archive },
    { id:'data',       label:'Data',               sub:'Backup, restore, and clear',          Icon:Database },
    ...(prefs.devUnlocked ? [{ id:'dev', label:'Developer', sub:'Experimental features & debug', Icon:FlaskConical }] : []),
    { id:'about',      label:'About',              sub:'App info and changelog',               Icon:ScrollText },
  ];

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
          {listHint ? (
            <Text style={{ fontSize:12, color:theme.muted, textAlign:'center',
              paddingHorizontal:16, paddingBottom:10, marginTop:-4 }}>{listHint}</Text>
          ) : null}
          {GROUPS.map(({ id, label, sub, Icon }) => (
            <Pressable key={id} onPress={() => {
              if (id === 'archived' && archivedHabits.length === 0) {
                setListHint('No archived habits');
                clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => setListHint(''), 2000);
                return;
              }
              setModal(id);
            }}
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

        <Text style={{ fontSize:11, color:theme.muted, textAlign:'center', marginBottom:24, marginTop:8 }}>
          richdmart.in
        </Text>
      </ScrollView>

      {/* ── Appearance Modal ── */}
      {modal === 'appearance' && (
        <Sheet title="Appearance" onClose={() => setModal(null)}>
          <MRow label="Follow device" sub="Automatically match iOS dark/light mode"
            value={prefs.dark == null} onChange={v => setP({ dark: v ? null : theme.isDark })} />
          {prefs.dark != null && (
            <MRow label="Dark mode" sub="Force dark background regardless of system"
              value={!!prefs.dark} onChange={v => setP({ dark: v })} />
          )}
          <View style={{ flexDirection:'row', alignItems:'center', paddingTop:18, paddingBottom:10 }}>
            <Text style={{ flex:1, fontSize:11, fontWeight:'700', color:theme.muted,
              textTransform:'uppercase', letterSpacing:0.7 }}>Accent color</Text>
            <Text style={{ fontSize:12, color:theme.muted }}>{SCHEMES[prefs.scheme]?.label || 'Sprout'}</Text>
          </View>
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
            {Object.entries(SCHEMES).map(([key, sc]) => {
              const isActive = prefs.scheme === key;
              const accentCol = sc.accent;
              return (
                <View key={key} style={{ flex:1, minWidth:40, overflow:'visible' }}>
                  <Pressable onPress={() => setP({ scheme: key })}
                    title={sc.label}
                    style={({ pressed }) => ({
                      height:42, borderRadius:13,
                      backgroundColor: accentCol,
                      borderWidth: isActive ? 2.5 : 1.5,
                      borderColor: isActive ? theme.text : 'transparent',
                      ...(isActive && theme.shadowsOn ? {
                        shadowColor: accentCol,
                        shadowOffset: {width:0,height:0},
                        shadowOpacity: theme.isDark ? 0.70 : 0.14,
                        shadowRadius: 12,
                        elevation: 6,
                      } : {}),
                      transform:[{scale: pressed?0.94:isActive?1.05:1}],
                    })} />
                </View>
              );
            })}
          </View>
        </Sheet>
      )}

      {/* ── Behavior Modal ── */}
      {modal === 'behavior' && (
        <Sheet title="Layout & Behavior" onClose={() => setModal(null)}>
          <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
            textTransform:'uppercase', letterSpacing:0.7, paddingBottom:4 }}>Display</Text>
          <MRow label="Streak badges" sub="Streak count on start/neutral; days-since on stop"
            value={prefs.showStreak} onChange={v => setP({ showStreak: v })} />
          <MRow label="Compact cards" sub="Tighter padding on habit cards"
            value={prefs.compact} onChange={v => setP({ compact: v })} />
          <View style={{ flexDirection:'row', alignItems:'center', gap:10,
            paddingVertical:10, borderBottomWidth:1, borderBottomColor:theme.border }}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'500', color:theme.text }}>Default view</Text>
              <Text style={{ fontSize:11.5, color:theme.muted, marginTop:1 }}>Shape of the habits list on launch</Text>
            </View>
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
          <View style={{ flexDirection:'row', alignItems:'center', gap:10,
            paddingVertical:12, borderBottomWidth:1, borderBottomColor:theme.border }}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'500', color:theme.text }}>Sort</Text>
              <Text style={{ fontSize:11.5, color:theme.muted, marginTop:1 }}>Order of the habits list</Text>
            </View>
            <View style={{ flexDirection:'row', backgroundColor:theme.surface2,
              borderWidth:1, borderColor:theme.border, borderRadius:10,
              padding:2, gap:1 }}>
              {[['mostLogged','Taps'],['name','A–Z'],['type','Type'],['recent','New']].map(([v,lbl]) => {
                const active = (prefs.habitsSort || 'mostLogged') === v;
                return (
                  <Pressable key={v} onPress={() => setP({ habitsSort: v })}
                    style={{ alignItems:'center',
                      paddingHorizontal:9, paddingVertical:7, borderRadius:8,
                      backgroundColor: active ? theme.solid : 'transparent' }}>
                    <Text style={{ fontSize:12, fontWeight:'600',
                      color: active ? theme.text : theme.muted }}>{lbl}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
            textTransform:'uppercase', letterSpacing:0.7, paddingTop:18, paddingBottom:4 }}>Logging</Text>
          <MRow label="Quick log" sub="Tap card = instant log; long-press to open detail"
            value={!!prefs.quickLog} onChange={v => setP({ quickLog: v })} />
          <MRow label="Repeat last by default" sub="Auto-fill most recent log's details on tap"
            value={prefs.repeatLastDefault} onChange={v => setP({ repeatLastDefault: v })} />
          <MRow label="Carry last mood & energy" sub="Copy mood and energy from your most recent log"
            value={prefs.repeatLastMoodEnergy} onChange={v => setP({ repeatLastMoodEnergy: v })} />
          <MRow label="Auto-tag recent habits" sub="Add habits logged in the last 5 min as tags"
            value={prefs.autoTagRecentHabits} onChange={v => setP({ autoTagRecentHabits: v })} />
          <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
            textTransform:'uppercase', letterSpacing:0.7, paddingTop:18, paddingBottom:4 }}>Analytics</Text>
          <MRow label="Open in Day view" sub="Analytics defaults to Day instead of All-time"
            value={prefs.insDay} onChange={v => setP({ insDay: v })} />
        </Sheet>
      )}

      {/* ── Watch Modal ── */}
      {modal === 'watch' && (
        <Sheet title="Apple Watch" onClose={() => setModal(null)}>
          {/* Connection status */}
          <View style={{ flexDirection:'row', alignItems:'center', paddingVertical:14,
            borderBottomWidth:1, borderBottomColor:theme.border }}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:15, fontWeight:'500', color:theme.text }}>Connection</Text>
              <Text style={{ fontSize:11.5, color:theme.muted, marginTop:2 }}>
                Changes here sync to your watch. Tap ⚙ on the watch to edit there.
              </Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <View style={{ width:8, height:8, borderRadius:4,
                backgroundColor: watchReachable === null ? theme.muted : watchReachable ? theme.typeGo : theme.typeSt }} />
              <Text style={{ fontSize:12, fontWeight:'600',
                color: watchReachable === null ? theme.muted : watchReachable ? theme.typeGo : theme.typeSt }}>
                {watchReachable === null ? 'Unknown' : watchReachable ? 'Connected' : 'Out of range'}
              </Text>
            </View>
          </View>
          {/* Auto-dismiss */}
          <View style={{ paddingVertical:14, borderBottomWidth:1, borderBottomColor:theme.border }}>
            <Text style={{ fontSize:15, fontWeight:'500', color:theme.text, marginBottom:3 }}>
              Auto-dismiss after logging
            </Text>
            <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
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
          <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
            textTransform:'uppercase', letterSpacing:0.7, paddingTop:18, paddingBottom:4 }}>Display</Text>
          <MRow label="Haptic feedback" sub="Vibrate on log, resist, and undo"
            value={prefs.watchHaptic !== false} onChange={v => setP({ watchHaptic: v })} />
          <MRow label="Show stats" sub="Streak count and today's total on each card"
            value={prefs.watchShowStats !== false} onChange={v => setP({ watchShowStats: v })} />
          <MRow label="Grid layout" sub="2-column grid instead of list"
            value={prefs.watchShowGrid === true} onChange={v => setP({ watchShowGrid: v })} />
          <MRow label="Show category" sub="Category label on each habit card"
            value={prefs.watchShowCategory !== false} onChange={v => setP({ watchShowCategory: v })} />
        </Sheet>
      )}

      {/* ── Logging Fields Modal ── */}
      {modal === 'fields' && (() => {
        const fieldsItems = orderedTracks.map(([k, l]) => ({
          key: k, label: l, on: prefs.track?.[k] !== false,
        }));
        const toggleField = k => setPrefs({
          ...prefs, track: { ...prefs.track, [k]: prefs.track?.[k] !== false ? false : undefined },
        });
        const renderRow = (item, drag) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Pressable onPressIn={drag} hitSlop={8} style={{ marginRight: 12 }}>
              <GripVertical size={16} strokeWidth={2} color={theme.muted} />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500',
              color: item.on ? theme.text : theme.muted }}>{item.label}</Text>
            <Toggle value={item.on} onChange={() => toggleField(item.key)} />
          </View>
        );
        return (
          <Sheet title="Logging Fields" onClose={() => setModal(null)} noScroll>
            <Text style={{ fontSize: 12, color: theme.muted, marginBottom: 12, lineHeight: 18 }}>
              Hold the grip to drag. Toggle to show or hide.
            </Text>
            <DraggableList
              data={fieldsItems}
              keyFn={item => item.key}
              renderRow={renderRow}
              onReorder={newItems => setPrefs({ ...prefs, fieldsOrder: newItems.map(i => i.key) })}
            />
          </Sheet>
        );
      })()}

      {/* ── Analytics Sections Modal ── */}
      {modal === 'sections' && (() => {
        const sectItems = sectionsOrder.map(k => ({
          key: k, label: SECTIONS_MAP[k] || k, visible: prefs.sections?.[k] !== false,
        }));
        const toggleSection = k => setPrefs({
          ...prefs, sections: { ...prefs.sections, [k]: prefs.sections?.[k] !== false ? false : undefined },
        });
        const renderRow = (item, drag) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
            borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Pressable onPressIn={drag} hitSlop={8} style={{ marginRight: 12 }}>
              <GripVertical size={16} strokeWidth={2} color={theme.muted} />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '500',
              color: item.visible ? theme.text : theme.muted }}>{item.label}</Text>
            <Toggle value={item.visible} onChange={() => toggleSection(item.key)} />
          </View>
        );
        return (
          <Sheet title="Analytics Sections" onClose={() => setModal(null)} noScroll>
            <Text style={{ fontSize: 12, color: theme.muted, marginBottom: 12, lineHeight: 18 }}>
              Hold the grip to drag. Toggle to show or hide.
            </Text>
            <DraggableList
              data={sectItems}
              keyFn={item => item.key}
              renderRow={renderRow}
              onReorder={newItems => setPrefs({ ...prefs, sectionsOrder: newItems.map(i => i.key) })}
            />
          </Sheet>
        );
      })()}

      {/* ── Time Gates Modal ── */}
      {modal === 'timegates' && (
        <TimeGatesModal
          data={data}
          prefs={prefs}
          setPrefs={setPrefs}
          theme={theme}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Data Modal ── */}
      {modal === 'data' && (
        <Sheet title="Data" onClose={() => setModal(null)}>
          <Pressable onPress={doExport}
            style={({ pressed }) => ({
              flexDirection:'row', alignItems:'center', gap:10,
              paddingVertical:14, borderBottomWidth:1, borderBottomColor:theme.border,
              opacity: pressed ? 0.7 : 1,
            })}>
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:'row', alignItems:'center', gap:7, marginBottom:1 }}>
                <Upload size={15} strokeWidth={2} color={theme.accent} />
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
                <Download size={15} strokeWidth={2} color={theme.accent} />
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

      {/* ── Archived Habits Modal ── */}
      {modal === 'archived' && (
        <Sheet title="Archived Habits" onClose={() => setModal(null)}>
          {archivedHabits.length === 0 ? (
            <Text style={{ fontSize:14, color:theme.muted, textAlign:'center', paddingVertical:24 }}>
              No archived habits.
            </Text>
          ) : archivedHabits.map(h => (
            <View key={h.id} style={{ flexDirection:'row', alignItems:'center', gap:10,
              paddingVertical:12, borderBottomWidth:1, borderBottomColor:theme.border }}>
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
              <Pressable onPress={() => {
                const hId = h.id;
                const hName = h.name;
                setModal(null);
                setTimeout(() => {
                  setSettAlert({
                    title: 'Delete habit',
                    message: `Permanently delete "${hName}" and all its logs?`,
                    buttons: [
                      { text: 'Cancel', style: 'cancel', onPress: () => setSettAlert(null) },
                      { text: 'Delete', style: 'destructive', onPress: () => { deleteHabit(hId); setSettAlert(null); } },
                    ],
                  });
                }, 350);
              }}
                style={{ paddingHorizontal:12, paddingVertical:6, borderRadius:10,
                  backgroundColor: theme.typeSt + '22', borderWidth:1, borderColor: theme.typeSt + '44' }}>
                <Text style={{ fontSize:12, fontWeight:'600', color:theme.typeSt }}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </Sheet>
      )}

      {/* ── Developer Modal ── */}
      {modal === 'dev' && (
        <Sheet title="Developer" onClose={() => setModal(null)}>
          <MRow label="Use Test Dataset"
            sub="Show demo habits instead of your real data. Your data is always preserved."
            value={!!prefs.dev?.useTestData}
            onChange={v => setDev({ useTestData: v })} />
          <MRow label="Show Lift Scores"
            sub="Display raw lift multiplier alongside co-occurrence % in Patterns"
            value={!!prefs.dev?.showLift}
            onChange={v => setDev({ showLift: v })} />
          <MRow label="Reduced Motion"
            sub="Skip tab-switch crossfade (0ms transition)"
            value={!!prefs.dev?.reducedMotion}
            onChange={v => setDev({ reducedMotion: v })} />
          <MRow label="Show Habit IDs"
            sub="Display habit.id in small text on each card"
            value={!!prefs.dev?.showIds}
            onChange={v => setDev({ showIds: v })} />
          <MRow label="Liquid Glass"
            sub="iOS 26+ glass on cards and nav. Install @callstack/liquid-glass and update src/lib/liquidGlass.js to activate."
            value={prefs.dev?.liquidGlass !== false}
            onChange={v => setDev({ liquidGlass: v })} />
          <MRow label="Glass Chips"
            sub="Apply liquid glass to filter and type chips everywhere"
            value={prefs.dev?.glassChips !== false}
            onChange={v => setDev({ glassChips: v })} />
        </Sheet>
      )}

      {/* ── Themed alert dialog ── */}
      <AppModal
        visible={!!settAlert}
        title={settAlert?.title}
        message={settAlert?.message}
        buttons={settAlert?.buttons ?? []}
        onDismiss={() => setSettAlert(null)}
      />

      {/* ── About Modal ── */}
      {modal === 'about' && (
        <Sheet title="About" onClose={() => { setModal(null); setTapHint(''); tapRef.current = 0; }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:14, paddingVertical:16,
            borderBottomWidth:1, borderBottomColor:theme.border }}>
            <View style={{ shadowColor:theme.accent, shadowOffset:{width:0,height:3}, shadowOpacity:0.3, shadowRadius:8 }}>
              <Image source={require('../../assets/icon.png')}
                style={{ width:52, height:52, borderRadius:14 }} />
            </View>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize:18, fontWeight:'700', color:theme.text, fontFamily:FONTS.heading }}>Sprout</Text>
              <Pressable onPress={handleVersionTap} hitSlop={10}>
                <Text style={{ fontSize:13, color:theme.muted, marginTop:2 }}>
                  Version {APP_VERSION} (build {APP_BUILD})
                </Text>
              </Pressable>
              {tapHint ? (
                <Text style={{ fontSize:11, color:theme.accent, marginTop:3 }}>{tapHint}</Text>
              ) : null}
            </View>
          </View>
          {prefs.devUnlocked && (
            <MRow label="Developer mode"
              sub="Reveals the Developer section in Settings"
              value={!!prefs.devUnlocked}
              onChange={v => setP({ devUnlocked: v || undefined })} />
          )}
          <Text style={{ fontSize:13, color:theme.muted, lineHeight:20, paddingVertical:14,
            borderBottomWidth:1, borderBottomColor:theme.border }}>
            A lightweight habit tracker for iOS and Apple Watch. All data lives on your device — no accounts, no servers.
          </Text>

          {/* Guided Tours */}
          <View style={{ paddingTop:16, paddingBottom:4, borderBottomWidth:1, borderBottomColor:theme.border }}>
            <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
              textTransform:'uppercase', letterSpacing:0.7, marginBottom:10 }}>
              Guided Tours
            </Text>
            {[
              { id:'home',     label:'Habits',    sub:'Logging, filters, and layout',     Icon:Home      },
              { id:'insights', label:'Analytics', sub:'Charts, timeframes, and sections', Icon:BarChart3 },
              { id:'settings', label:'Settings',  sub:'Appearance, fields, time gates, and more', Icon:Settings },
            ].map(({ id, label, sub, Icon }) => (
              <Pressable key={id}
                onPress={() => {
                  if (id === 'settings') {
                    setPendingTutorial('settings');
                    setModal(null);
                  } else {
                    setPrefs({ ...prefs, tutorialSeen: { ...(prefs.tutorialSeen || {}), [id]: undefined } });
                    setModal(null);
                    onNavigate?.(id);
                  }
                }}
                style={({ pressed }) => ({
                  flexDirection:'row', alignItems:'center', gap:12,
                  paddingVertical:12, borderBottomWidth:1, borderBottomColor:theme.border,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View style={{ width:34, height:34, borderRadius:9,
                  backgroundColor:theme.accentDim, alignItems:'center', justifyContent:'center' }}>
                  <Icon size={17} strokeWidth={2} color={theme.accent} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={{ fontSize:15, fontWeight:'600', color:theme.text }}>{label}</Text>
                  <Text style={{ fontSize:12, color:theme.muted, marginTop:1 }}>{sub}</Text>
                </View>
                <Text style={{ fontSize:12, color:theme.accent, fontWeight:'600' }}>Retrigger</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setPrefs({ ...prefs, tutorialSeen: undefined })}
              style={({ pressed }) => ({
                alignItems:'center', paddingVertical:13, opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize:13, fontWeight:'600', color:theme.muted }}>Reset all tours</Text>
            </Pressable>
          </View>

          {/* Changelog inline */}
          <View style={{ paddingTop:16 }}>
            <Text style={{ fontSize:11, fontWeight:'700', color:theme.muted,
              textTransform:'uppercase', letterSpacing:0.7, marginBottom:14 }}>Changelog</Text>
            {CHANGELOG.map(b => (
              <View key={b.version} style={{ marginBottom:18 }}>
                <Text style={{ fontSize:12, fontWeight:'700', color:theme.accent,
                  marginBottom:6, fontFamily:FONTS.mono }}>{b.version}</Text>
                {b.changes.map((c, i) => (
                  <Text key={i} style={{ fontSize:12.5, color:theme.text2, lineHeight:19,
                    paddingLeft:10, marginBottom:3 }}>· {c}</Text>
                ))}
              </View>
            ))}
          </View>
        </Sheet>
      )}
    </View>
  );
}
