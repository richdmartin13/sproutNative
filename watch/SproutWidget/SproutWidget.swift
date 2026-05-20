import WidgetKit
import SwiftUI
import AppIntents

private let APP_GROUP = "group.sprout.richdmart.in"

// ─────────────────────────────── Color helpers ────────────────────────────────

extension Color {
    init(hex: String) {
        var h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
        var int: UInt64 = 0
        Scanner(string: h).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(red: max(0, min(1, r)), green: max(0, min(1, g)), blue: max(0, min(1, b)))
    }
}

// Derives a deep dark background from an accent hex — preserves the hue family.
private func darkBg(hex: String) -> Color {
    var h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: h).scanHexInt64(&int)
    let r = Double((int >> 16) & 0xFF) / 255 * 0.16
    let g = Double((int >> 8) & 0xFF) / 255 * 0.16
    let b = Double(int & 0xFF) / 255 * 0.16
    return Color(red: r, green: g, blue: b)
}

// ─────────────────────────────── Data ────────────────────────────────────────

struct WidgetHabit: Codable, Identifiable {
    let id: String
    let name: String
    let type: String
    let category: String
    let todayCount: Int
    let streak: Int
    let daysSince: Int?
}

struct WeeklyBar: Codable {
    let label: String   // "M", "T", etc.
    let done: Int
    let total: Int
}

struct WidgetSnap {
    let habits: [WidgetHabit]
    let loggedToday: Int
    let total: Int
    let accentHex: String
    let weeklyBars: [WeeklyBar]
    var pct: Double { total > 0 ? Double(loggedToday) / Double(total) : 0 }
    var remaining: Int { total - loggedToday }
    var bestStreak: Int { habits.map(\.streak).max() ?? 0 }

    static let placeholder = WidgetSnap(
        habits: [
            WidgetHabit(id: "1", name: "Morning run",  type: "go", category: "Health", todayCount: 1, streak: 12, daysSince: nil),
            WidgetHabit(id: "2", name: "Read 20 min",  type: "go", category: "Mind",   todayCount: 1, streak: 5,  daysSince: nil),
            WidgetHabit(id: "3", name: "No junk food", type: "st", category: "Health", todayCount: 0, streak: 0,  daysSince: 4),
            WidgetHabit(id: "4", name: "Meditate",     type: "go", category: "Mind",   todayCount: 0, streak: 0,  daysSince: nil),
            WidgetHabit(id: "5", name: "Limit coffee", type: "st", category: "Health", todayCount: 0, streak: 0,  daysSince: 1),
        ],
        loggedToday: 5, total: 8,
        accentHex: "#2dd36f",
        weeklyBars: [
            WeeklyBar(label: "M", done: 5, total: 8),
            WeeklyBar(label: "T", done: 3, total: 8),
            WeeklyBar(label: "W", done: 7, total: 8),
            WeeklyBar(label: "T", done: 4, total: 8),
            WeeklyBar(label: "F", done: 6, total: 8),
            WeeklyBar(label: "S", done: 2, total: 8),
            WeeklyBar(label: "S", done: 8, total: 8),
        ]
    )
}

private func readSnap() -> WidgetSnap {
    let defaults = UserDefaults(suiteName: APP_GROUP)
    let accentHex = defaults?.string(forKey: "sprout_accent") ?? "#2dd36f"
    let weeklyBars = (defaults?.data(forKey: "sprout_weekly")
        .flatMap { try? JSONDecoder().decode([WeeklyBar].self, from: $0) }) ?? []

    guard
        let data   = defaults?.data(forKey: "sprout_habits"),
        let habits = try? JSONDecoder().decode([WidgetHabit].self, from: data)
    else { return .placeholder }

    let logged = habits.filter { h in
        h.type == "st" ? h.todayCount == 0 : h.todayCount > 0
    }.count
    return WidgetSnap(habits: habits, loggedToday: logged, total: habits.count,
                      accentHex: accentHex, weeklyBars: weeklyBars)
}

// ─────────────────────────────── Timeline ────────────────────────────────────

struct SproutEntry: TimelineEntry {
    let date: Date
    let snap: WidgetSnap
}

struct SproutProvider: TimelineProvider {
    func placeholder(in _: Context) -> SproutEntry { SproutEntry(date: .now, snap: .placeholder) }
    func getSnapshot(in _: Context, completion: @escaping (SproutEntry) -> Void) {
        completion(SproutEntry(date: .now, snap: readSnap()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<SproutEntry>) -> Void) {
        let entry    = SproutEntry(date: .now, snap: readSnap())
        let midnight = Calendar.current.startOfDay(for: .now).addingTimeInterval(86_400)
        completion(Timeline(entries: [entry], policy: .after(midnight)))
    }
}

// ─────────────────────────────── Type colors ─────────────────────────────────

private func dotColor(type: String, accent: Color) -> Color {
    switch type {
    case "go": return accent
    case "st": return Color(red: 0.98, green: 0.45, blue: 0.45)
    default:   return Color(red: 0.55, green: 0.75, blue: 0.95)
    }
}

// ─────────────────────────────── Shared subviews ─────────────────────────────

private struct RingView: View {
    let pct: Double
    let size: CGFloat
    let accent: Color
    var body: some View {
        ZStack {
            Circle().stroke(.white.opacity(0.12), lineWidth: size * 0.10)
            Circle()
                .trim(from: 0, to: pct)
                .stroke(accent, style: StrokeStyle(lineWidth: size * 0.10, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

private struct HabitRow: View {
    let habit: WidgetHabit
    let accent: Color
    private var done: Bool { habit.type == "st" ? habit.todayCount == 0 : habit.todayCount > 0 }
    // Stop habits: show days since last slip; go/ne habits: show streak days
    private var badge: String? {
        if habit.type == "st" {
            guard let ds = habit.daysSince, ds > 0 else { return nil }
            return "\(ds)d"
        }
        return habit.streak > 1 ? "\(habit.streak)d" : nil
    }
    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 12))
                .foregroundStyle(done ? dotColor(type: habit.type, accent: accent) : .white.opacity(0.22))
            Text(habit.name)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(done ? .white : .white.opacity(0.45))
                .lineLimit(1)
            Spacer(minLength: 0)
            if let b = badge {
                Text(b)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(dotColor(type: habit.type, accent: accent).opacity(0.75))
            }
        }
    }
}

// ─────────────────────────────── Standard sizes ──────────────────────────────

private struct SmallView: View {
    let snap: WidgetSnap
    var body: some View {
        let accent = Color(hex: snap.accentHex)
        VStack(spacing: 5) {
            ZStack {
                RingView(pct: snap.pct, size: 56, accent: accent)
                VStack(spacing: 0) {
                    Image(systemName: "leaf.fill")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(accent)
                    Text("\(snap.loggedToday)")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                }
            }
            Text("\(snap.loggedToday) of \(snap.total)")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white.opacity(0.45))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct MediumView: View {
    let snap: WidgetSnap
    private var topHabits: [WidgetHabit] { Array(snap.habits.prefix(3)) }
    var body: some View {
        let accent = Color(hex: snap.accentHex)
        HStack(spacing: 0) {
            VStack(spacing: 4) {
                ZStack {
                    RingView(pct: snap.pct, size: 46, accent: accent)
                    VStack(spacing: 0) {
                        Image(systemName: "leaf.fill")
                            .font(.system(size: 7, weight: .bold))
                            .foregroundStyle(accent)
                        Text("\(snap.loggedToday)")
                            .font(.system(size: 16, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                    }
                }
                Text("/\(snap.total)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.35))
            }
            .frame(width: 76)
            .padding(.vertical, 14)

            Rectangle().fill(.white.opacity(0.10)).frame(width: 1).padding(.vertical, 14)

            VStack(alignment: .leading, spacing: 8) {
                ForEach(topHabits) { h in HabitRow(habit: h, accent: accent) }
                if snap.habits.count > 3 {
                    Text("+ \(snap.habits.count - 3) more")
                        .font(.system(size: 10))
                        .foregroundStyle(.white.opacity(0.25))
                }
                Spacer(minLength: 0)
            }
            .padding(.leading, 12).padding(.trailing, 14).padding(.vertical, 12)

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct LargeView: View {
    let snap: WidgetSnap
    private var topHabits: [WidgetHabit] { Array(snap.habits.prefix(8)) }
    var body: some View {
        let accent = Color(hex: snap.accentHex)
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                ZStack {
                    RingView(pct: snap.pct, size: 54, accent: accent)
                    VStack(spacing: 0) {
                        Image(systemName: "leaf.fill")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(accent)
                        Text("\(snap.loggedToday)")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    statPill(value: "\(snap.remaining) left",             icon: "circle")
                    statPill(value: "\(snap.bestStreak)d streak",         icon: "flame.fill")
                    statPill(value: "\(Int(snap.pct * 100))% done",       icon: "chart.bar.fill")
                }
                Spacer(minLength: 0)
            }
            Rectangle().fill(.white.opacity(0.08)).frame(height: 0.5)
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(topHabits.enumerated()), id: \.element.id) { idx, h in
                    if idx > 0 { Rectangle().fill(.white.opacity(0.06)).frame(height: 0.5) }
                    HabitRow(habit: h, accent: accent).padding(.vertical, 5)
                }
                if snap.habits.count > 8 {
                    Text("+ \(snap.habits.count - 8) more")
                        .font(.system(size: 10)).foregroundStyle(.white.opacity(0.25)).padding(.top, 4)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func statPill(value: String, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon).font(.system(size: 9)).foregroundStyle(.white.opacity(0.45))
            Text(value).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.75))
        }
    }
}

// ─────────────────────────────── Interactive sizes (iOS 17+) ─────────────────

@available(iOS 17.0, *)
private struct InteractiveTile: View {
    let habit: WidgetHabit
    let accent: Color
    private var done: Bool { habit.type == "st" ? habit.todayCount == 0 : habit.todayCount > 0 }
    private var dc: Color { dotColor(type: habit.type, accent: accent) }
    private var badge: String? {
        if habit.type == "st" {
            guard let ds = habit.daysSince, ds > 0 else { return nil }
            return "\(ds)d"
        }
        return habit.streak > 1 ? "\(habit.streak)d" : nil
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                Circle()
                    .fill(done ? dc : Color.white.opacity(0.18))
                    .frame(width: 7, height: 7)
                    .padding(.top, 1)
                Spacer(minLength: 0)
                if let b = badge {
                    Text(b)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(dc.opacity(0.80))
                }
            }
            Text(habit.name)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(done ? .white : .white.opacity(0.50))
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 4)
            Spacer(minLength: 0)
            // Log button for go/ne; status icon for stop
            if habit.type == "st" {
                Image(systemName: done ? "hand.raised.fill" : "exclamationmark.circle")
                    .font(.system(size: 16))
                    .foregroundStyle(done ? dc : Color.red.opacity(0.65))
                    .frame(maxWidth: .infinity, alignment: .trailing)
            } else {
                Button(intent: WidgetLogIntent(id: habit.id, name: habit.name)) {
                    Image(systemName: done ? "checkmark.circle.fill" : "plus.circle")
                        .font(.system(size: 18))
                        .foregroundStyle(done ? dc : .white.opacity(0.40))
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(done ? dc.opacity(0.18) : Color.white.opacity(0.06))
        )
    }
}

@available(iOS 17.0, *)
private struct InteractiveMediumView: View {
    let snap: WidgetSnap
    private var topHabits: [WidgetHabit] { Array(snap.habits.prefix(3)) }
    var body: some View {
        let accent = Color(hex: snap.accentHex)
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "leaf.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(accent)
                Text("\(snap.loggedToday) of \(snap.total) today")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.55))
                Spacer()
                RingView(pct: snap.pct, size: 22, accent: accent)
            }
            HStack(spacing: 8) {
                ForEach(topHabits) { h in
                    InteractiveTile(habit: h, accent: accent)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

@available(iOS 17.0, *)
private struct InteractiveLargeView: View {
    let snap: WidgetSnap
    private var habits: [WidgetHabit] { Array(snap.habits.prefix(6)) }
    var body: some View {
        let accent = Color(hex: snap.accentHex)
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ZStack {
                    RingView(pct: snap.pct, size: 44, accent: accent)
                    VStack(spacing: 0) {
                        Image(systemName: "leaf.fill").font(.system(size: 7, weight: .bold)).foregroundStyle(accent)
                        Text("\(snap.loggedToday)").font(.system(size: 14, weight: .bold, design: .rounded)).foregroundStyle(.white)
                    }
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(snap.remaining) remaining")
                        .font(.system(size: 13, weight: .semibold)).foregroundStyle(.white)
                    Text("\(snap.bestStreak)d best streak · \(Int(snap.pct * 100))% done")
                        .font(.system(size: 10)).foregroundStyle(.white.opacity(0.50))
                }
                Spacer()
            }
            Rectangle().fill(.white.opacity(0.08)).frame(height: 0.5)
            // 2-column grid
            let cols = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]
            LazyVGrid(columns: cols, spacing: 8) {
                ForEach(habits) { h in
                    InteractiveTile(habit: h, accent: accent)
                        .frame(height: 88)
                }
            }
            if snap.habits.count > 6 {
                Text("+ \(snap.habits.count - 6) more habits")
                    .font(.system(size: 10)).foregroundStyle(.white.opacity(0.30))
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// ─────────────────────────────── Weekly bar chart widget ─────────────────────

private struct BarChartView: View {
    let bars: [WeeklyBar]
    let accent: Color
    var body: some View {
        HStack(alignment: .bottom, spacing: 4) {
            ForEach(Array(bars.enumerated()), id: \.offset) { _, bar in
                let pct = bar.total > 0 ? Double(bar.done) / Double(bar.total) : 0
                let isToday = bar.label == todayLabel()
                VStack(spacing: 2) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(isToday ? accent : accent.opacity(0.40))
                        .frame(height: max(4, pct * 40))
                    Text(bar.label)
                        .font(.system(size: 8, weight: isToday ? .bold : .medium))
                        .foregroundStyle(isToday ? .white : .white.opacity(0.45))
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
    private func todayLabel() -> String {
        let fmt = DateFormatter(); fmt.dateFormat = "EEEEE"; return fmt.string(from: Date())
    }
}

private struct WeeklySmallView: View {
    let snap: WidgetSnap
    var body: some View {
        let accent = Color(hex: snap.accentHex)
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "chart.bar.fill").font(.system(size: 9, weight: .bold)).foregroundStyle(accent)
                Text("This week").font(.system(size: 10, weight: .semibold)).foregroundStyle(.white.opacity(0.55))
            }
            if snap.weeklyBars.isEmpty {
                Text("No data yet").font(.system(size: 11)).foregroundStyle(.white.opacity(0.35))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Spacer(minLength: 0)
                BarChartView(bars: snap.weeklyBars, accent: accent)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

private struct WeeklyMediumView: View {
    let snap: WidgetSnap
    var body: some View {
        let accent = Color(hex: snap.accentHex)
        HStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Image(systemName: "chart.bar.fill").font(.system(size: 9, weight: .bold)).foregroundStyle(accent)
                    Text("7-Day").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white)
                }
                let avg = snap.weeklyBars.isEmpty ? 0 : snap.weeklyBars.map { $0.done }.reduce(0, +) / snap.weeklyBars.count
                Text("\(avg) avg/day")
                    .font(.system(size: 10)).foregroundStyle(.white.opacity(0.45))
                Spacer(minLength: 0)
                Text("\(snap.loggedToday)/\(snap.total) today")
                    .font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
            }
            .frame(width: 90)
            .padding(.vertical, 14).padding(.leading, 14)

            Rectangle().fill(.white.opacity(0.10)).frame(width: 1).padding(.vertical, 14)

            VStack(alignment: .leading) {
                if snap.weeklyBars.isEmpty {
                    Text("Log habits to see your weekly chart.").font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.35)).frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    BarChartView(bars: snap.weeklyBars, accent: accent)
                }
            }
            .padding(12)
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// ─────────────────────────────── Lock screen ─────────────────────────────────

private struct CircularView: View {
    let snap: WidgetSnap
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Image(systemName: "leaf.fill").font(.system(size: 8))
                Text("\(snap.loggedToday)")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
            }
        }.widgetAccentable()
    }
}

private struct RectangularView: View {
    let snap: WidgetSnap
    private var topStreak: WidgetHabit? {
        snap.habits.filter { $0.streak > 1 }.max { $0.streak < $1.streak }
    }
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "leaf.fill").font(.system(size: 13)).widgetAccentable()
            VStack(alignment: .leading, spacing: 0) {
                Text("\(snap.loggedToday)/\(snap.total) habits")
                    .font(.system(size: 14, weight: .semibold))
                if let t = topStreak {
                    Text("\(t.name) · \(t.streak)d")
                        .font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }.widgetAccentable()
    }
}

private struct InlineView: View {
    let snap: WidgetSnap
    var body: some View {
        Label("\(snap.loggedToday)/\(snap.total) habits today", systemImage: "leaf.fill")
            .widgetAccentable()
    }
}

// ─────────────────────────────── Entry views ─────────────────────────────────

struct SproutWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme)  var colorScheme
    let entry: SproutEntry

    var body: some View {
        switch family {
        case .systemSmall:          SmallView(snap: entry.snap)
        case .systemMedium:         MediumView(snap: entry.snap)
        case .systemLarge:          LargeView(snap: entry.snap)
        case .accessoryCircular:    CircularView(snap: entry.snap)
        case .accessoryRectangular: RectangularView(snap: entry.snap)
        case .accessoryInline:      InlineView(snap: entry.snap)
        default:                    SmallView(snap: entry.snap)
        }
    }
}

struct InteractiveWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: SproutEntry
    var body: some View {
        if #available(iOS 17.0, *) {
            switch family {
            case .systemMedium: InteractiveMediumView(snap: entry.snap)
            case .systemLarge:  InteractiveLargeView(snap: entry.snap)
            default:            InteractiveMediumView(snap: entry.snap)
            }
        } else {
            MediumView(snap: entry.snap)
        }
    }
}

struct WeeklyWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: SproutEntry
    var body: some View {
        switch family {
        case .systemSmall:  WeeklySmallView(snap: entry.snap)
        case .systemMedium: WeeklyMediumView(snap: entry.snap)
        default:            WeeklySmallView(snap: entry.snap)
        }
    }
}

// ─────────────────────────────── Background modifier ─────────────────────────

private struct WidgetBg: ViewModifier {
    @Environment(\.colorScheme) var cs
    let accentHex: String
    func body(content: Content) -> some View {
        let bg: Color = cs == .dark ? darkBg(hex: accentHex) : Color(.systemBackground)
        if #available(iOS 17, *) {
            content.containerBackground(bg, for: .widget)
        } else {
            content.background(bg)
        }
    }
}

// ─────────────────────────────── Widgets ─────────────────────────────────────

struct SproutWidget: Widget {
    let kind = "SproutWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SproutProvider()) { entry in
            SproutWidgetEntryView(entry: entry)
                .modifier(WidgetBg(accentHex: entry.snap.accentHex))
        }
        .configurationDisplayName("Sprout")
        .description("Today's habit progress at a glance.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryCircular, .accessoryRectangular, .accessoryInline,
        ])
    }
}

struct SproutInteractiveWidget: Widget {
    let kind = "SproutInteractiveWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SproutProvider()) { entry in
            InteractiveWidgetEntryView(entry: entry)
                .modifier(WidgetBg(accentHex: entry.snap.accentHex))
        }
        .configurationDisplayName("Sprout — Log Habits")
        .description("Tap to log habits directly from your home screen.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct SproutWeeklyWidget: Widget {
    let kind = "SproutWeeklyWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SproutProvider()) { entry in
            WeeklyWidgetEntryView(entry: entry)
                .modifier(WidgetBg(accentHex: entry.snap.accentHex))
        }
        .configurationDisplayName("Sprout — This Week")
        .description("Your 7-day habit completion chart.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
