# sprout_2025.05.12#8

## Native — sproutNative_2025.05.12#8

### Full UI Parity Pass

**Fonts**
- Playfair Display (500, 700, italic) loaded via `@expo-google-fonts/playfair-display`
- DM Mono (300, 400, 500) loaded via `@expo-google-fonts/dm-mono`
- Applied to headings, stat numbers, log timestamps, version strings, mono data

**Modal z-ordering**
- All sheets now use React Native `Modal` component with `transparent`
- Guaranteed to render above BottomNav, SafeAreaView, and StatusBar at all times

**HomeScreen**
- Two-row Filters: category chips (row 1) + type chips Start/Stop/Neutral (row 2) — matches web
- HabitCard: spark bars, streak flame badge, days-free for Stop habits, compact mode, grid mode

**Analytics**
- Filters bar (category + type) now present, matching web
- Spider chart: pure-RN polygon geometry, all 5 modes (Tags/Mood/Energy/Ease/Co-habits)
- Trends: 30-day line chart with per-habit toggle, same palette as web
- Hourly distribution: stacked bar by go/stop/neutral (day mode only)
- Mood & Energy bars
- Rankings with per-habit color bars
- Day of Week
- Tags

**TapScreen**
- Spider chart embedded (same 5 modes as web TapScreen.jsx)
- Log list shows formatted time (fmtTime) + tags + mood
- All animations: spring-based tap zone, spring sheet

**Settings**
- Import: expo-document-picker → FileSystem.readAsStringAsync → importJson
- Export: exportJson → FileSystem.writeAsStringAsync → Sharing.shareAsync
- Clear all: Alert.alert confirm before wiping
- All toggles, scheme picker, behavior settings functional

**Icons**
- Icon.js wrapper removed; all components use `Ionicons` from `@expo/vector-icons` directly
- Active nav icons use filled variants (home, bar-chart, settings)

**New dependencies**
- `expo-font ~14.0.9`
- `expo-document-picker ~14.0.8`
- `@expo-google-fonts/playfair-display ~0.3.0`
- `@expo-google-fonts/dm-mono ~0.3.0`
