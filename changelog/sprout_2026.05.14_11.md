# sprout_2026.05.14#11

## Native — sproutNative_2026.05.14#11

### Visual parity with web
- Analytics section headers now match web exactly: flex row with title + subtitle (e.g. "tap a day to focus it")
- Summary strip wrapped in "All time" / "This day" Section header — matches web
- All stat cards have glass highlight overlay

### Navigation
- BottomNav: animated label expand/collapse using `Animated.spring` — matches web `.bnav button span` CSS transition
- Active tab shows glow (shadowColor: accent) matching web `box-shadow: 0 2px 10px var(--accent-glow)`
- Nav pill inner top highlight border matches web `.bnav` inset box-shadow

### Screen transitions
- `AnimatedScreen` wrapper: opacity 0→1 + translateY 6→0 over 220ms — identical to web `.screen-transition` keyframe
- No flash on tab switch — animation fires only on key change, not re-renders

### Versioning
- All build numbers now use correct date (2026.05.14)
- In-app changelog fully populated in both apps
