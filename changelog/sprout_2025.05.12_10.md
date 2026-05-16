# sprout_2025.05.12#10

## Web + Native — sprout_2025.05.12#10

### New: All trackables for all habit types
- Ease, duration, resistance outcome, trigger, context, mood, energy, tags, notes are all shown regardless of habit type
- Controlled exclusively by Settings → Logging Fields toggles
- Saving respects the track prefs (disabled fields save empty/zero)
- Web `LogDetailsSheet.jsx` updated to match

### Native fixes
- **Settings toggles**: `track.ease`, `track.mood`, `track.energy` etc now correctly gate fields in LogSheet and are respected on save
- **Spider ease tab**: shows "Resistance" label for stop habits (matching web SpiderCard)
- **Analytics filter bar**: single top filter bar (category + type) drives all sections — Rankings, Spider, Mood/Energy, Tags, Heatmap all use the same `filtered` set
- **Glass design**: highlight overlay added to habit cards, section cards, stat cards — matches web `.section::before` and `.habit-card::before` gradients
- **Sizing**: habit card name 16.5px, section headers 13px uppercase, sheet title Playfair 19px — all matching web CSS values
- **Sheet h2**: Playfair Display (matching web `.sheet h2`)

### Web fixes
- `LogDetailsSheet.jsx`: all trackables for all habit types
- `SettingsModals.jsx`: carry/auto-tag settings un-nested to inline rows; changelog updated
