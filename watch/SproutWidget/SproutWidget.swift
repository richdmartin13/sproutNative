import WidgetKit
import SwiftUI

private let APP_GROUP = "group.sprout.richdmart.in"

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

struct WidgetSnap {
    let habits: [WidgetHabit]
    let loggedToday: Int
    let total: Int
    var pct: Double { total > 0 ? Double(loggedToday) / Double(total) : 0 }
    var remaining: Int { total - loggedToday }
    var bestStreak: Int { habits.map(\.streak).max() ?? 0 }

    static let placeholder = WidgetSnap(habits: [
        WidgetHabit(id: "1", name: "Morning run",  type: "go", category: "Health", todayCount: 1, streak: 12, daysSince: nil),
        WidgetHabit(id: "2", name: "Read 20 min",  type: "go", category: "Mind",   todayCount: 1, streak: 5,  daysSince: nil),
        WidgetHabit(id: "3", name: "No junk food", type: "st", category: "Health", todayCount: 0, streak: 3,  daysSince: 0),
        WidgetHabit(id: "4", name: "Meditate",     type: "go", category: "Mind",   todayCount: 0, streak: 0,  daysSince: nil),
        WidgetHabit(id: "5", name: "Limit coffee", type: "st", category: "Health", todayCount: 0, streak: 7,  daysSince: 0),
    ], loggedToday: 5, total: 8)
}

private func readSnap() -> WidgetSnap {
    guard
        let defaults = UserDefaults(suiteName: APP_GROUP),
        let data     = defaults.data(forKey: "sprout_habits"),
        let habits   = try? JSONDecoder().decode([WidgetHabit].self, from: data)
    else { return .placeholder }

    let logged = habits.filter { h in
        h.type == "st" ? h.todayCount == 0 : h.todayCount > 0
    }.count
    return WidgetSnap(habits: habits, loggedToday: logged, total: habits.count)
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

// ─────────────────────────────── Shared values ───────────────────────────────

private let green = Color(red: 0.18, green: 0.84, blue: 0.47)
private let bg    = Color(red: 0.10, green: 0.28, blue: 0.17)

private func dotColor(_ type: String) -> Color {
    switch type {
    case "go": return green
    case "st": return Color(red: 0.98, green: 0.45, blue: 0.45)
    default:   return Color(red: 0.55, green: 0.75, blue: 0.95)
    }
}

// ─────────────────────────────── Subviews ────────────────────────────────────

private struct HabitRow: View {
    let habit: WidgetHabit
    private var done: Bool { habit.type == "st" ? habit.todayCount == 0 : habit.todayCount > 0 }
    private var badge: String? {
        habit.type == "st"
            ? (habit.streak > 0 ? "\(habit.streak)d" : nil)
            : (habit.streak > 1 ? "\(habit.streak)d" : nil)
    }
    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 12))
                .foregroundStyle(done ? dotColor(habit.type) : .white.opacity(0.22))
            Text(habit.name)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(done ? .white : .white.opacity(0.45))
                .lineLimit(1)
            Spacer(minLength: 0)
            if let b = badge {
                Text(b)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(dotColor(habit.type).opacity(0.75))
            }
        }
    }
}

private struct RingView: View {
    let pct: Double
    let size: CGFloat
    var body: some View {
        ZStack {
            Circle().stroke(.white.opacity(0.12), lineWidth: size * 0.10)
            Circle()
                .trim(from: 0, to: pct)
                .stroke(green, style: StrokeStyle(lineWidth: size * 0.10, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
        .frame(width: size, height: size)
    }
}

// ─────────────────────────────── Widget sizes ────────────────────────────────

// Small: ring + count, lives on the green background from containerBackground
private struct SmallView: View {
    let snap: WidgetSnap
    var body: some View {
        VStack(spacing: 5) {
            ZStack {
                RingView(pct: snap.pct, size: 56)
                VStack(spacing: 0) {
                    Image(systemName: "leaf.fill")
                        .font(.system(size: 8, weight: .bold))
                        .foregroundStyle(green)
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

// Medium: ring + count on left, top habits on right
private struct MediumView: View {
    let snap: WidgetSnap
    private var topHabits: [WidgetHabit] { Array(snap.habits.prefix(3)) }
    var body: some View {
        HStack(spacing: 0) {
            VStack(spacing: 4) {
                ZStack {
                    RingView(pct: snap.pct, size: 46)
                    VStack(spacing: 0) {
                        Image(systemName: "leaf.fill")
                            .font(.system(size: 7, weight: .bold))
                            .foregroundStyle(green)
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

            Rectangle()
                .fill(.white.opacity(0.10))
                .frame(width: 1)
                .padding(.vertical, 14)

            VStack(alignment: .leading, spacing: 8) {
                ForEach(topHabits) { h in HabitRow(habit: h) }
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

// Large: ring + stats row at top, full habit list below
private struct LargeView: View {
    let snap: WidgetSnap
    private var topHabits: [WidgetHabit] { Array(snap.habits.prefix(8)) }
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Stats row
            HStack(spacing: 12) {
                ZStack {
                    RingView(pct: snap.pct, size: 54)
                    VStack(spacing: 0) {
                        Image(systemName: "leaf.fill")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(green)
                        Text("\(snap.loggedToday)")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                    }
                }
                VStack(alignment: .leading, spacing: 6) {
                    statPill(value: "\(snap.remaining) left", icon: "circle")
                    statPill(value: "\(snap.bestStreak)d streak", icon: "flame.fill")
                    statPill(value: "\(Int(snap.pct * 100))% done", icon: "chart.bar.fill")
                }
                Spacer(minLength: 0)
            }

            Rectangle()
                .fill(.white.opacity(0.08))
                .frame(height: 0.5)

            // Habit list
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(topHabits.enumerated()), id: \.element.id) { idx, h in
                    if idx > 0 {
                        Rectangle().fill(.white.opacity(0.06)).frame(height: 0.5)
                    }
                    HabitRow(habit: h).padding(.vertical, 5)
                }
                if snap.habits.count > 8 {
                    Text("+ \(snap.habits.count - 8) more")
                        .font(.system(size: 10))
                        .foregroundStyle(.white.opacity(0.25))
                        .padding(.top, 4)
                }
            }

            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private func statPill(value: String, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 9))
                .foregroundStyle(.white.opacity(0.45))
            Text(value)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white.opacity(0.75))
        }
    }
}

// Lock screen / accessory sizes — system handles rendering style
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
                    Text("\(t.name) · \(t.streak)d streak")
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

// ─────────────────────────────── Entry view ──────────────────────────────────

struct SproutWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
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

// ─────────────────────────────── Widget ──────────────────────────────────────

private struct WidgetContainerBackground: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 17, *) {
            content.containerBackground(bg, for: .widget)
        } else {
            content.background(bg)
        }
    }
}

struct SproutWidget: Widget {
    let kind = "SproutWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SproutProvider()) { entry in
            SproutWidgetEntryView(entry: entry)
                .modifier(WidgetContainerBackground())
        }
        .configurationDisplayName("Sprout")
        .description("Today's habit progress at a glance.")
        .supportedFamilies([
            .systemSmall, .systemMedium, .systemLarge,
            .accessoryCircular, .accessoryRectangular, .accessoryInline,
        ])
    }
}
