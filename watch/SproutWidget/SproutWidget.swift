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

    static let placeholder = WidgetSnap(habits: [
        WidgetHabit(id: "1", name: "Morning run",  type: "go", category: "Health", todayCount: 1, streak: 12, daysSince: nil),
        WidgetHabit(id: "2", name: "Read 20 min",  type: "go", category: "Mind",   todayCount: 1, streak: 5,  daysSince: nil),
        WidgetHabit(id: "3", name: "No junk food", type: "st", category: "Health", todayCount: 0, streak: 3,  daysSince: 0),
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
            ? (habit.streak > 0 ? "\(habit.streak)d free" : nil)
            : (habit.streak > 1 ? "\(habit.streak)d" : nil)
    }
    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 11))
                .foregroundStyle(done ? dotColor(habit.type) : .white.opacity(0.25))
            Text(habit.name)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(done ? .white : .white.opacity(0.5))
                .lineLimit(1)
            Spacer(minLength: 0)
            if let b = badge {
                Text(b).font(.system(size: 10)).foregroundStyle(dotColor(habit.type).opacity(0.8))
            }
        }
    }
}

// ─────────────────────────────── Widget sizes ────────────────────────────────

private struct SmallView: View {
    let snap: WidgetSnap
    var body: some View {
        ZStack {
            bg
            VStack(spacing: 4) {
                Image(systemName: "leaf.fill")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(green)
                HStack(alignment: .lastTextBaseline, spacing: 3) {
                    Text("\(snap.loggedToday)")
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("/\(snap.total)")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(.white.opacity(0.45))
                }
                Text("today")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.4))
                    .textCase(.uppercase)
                    .kerning(1)
            }
        }
    }
}

private struct MediumView: View {
    let snap: WidgetSnap
    private var topHabits: [WidgetHabit] { Array(snap.habits.prefix(3)) }
    var body: some View {
        HStack(spacing: 0) {
            VStack(spacing: 2) {
                Image(systemName: "leaf.fill").font(.system(size: 16)).foregroundStyle(green)
                Text("\(snap.loggedToday)")
                    .font(.system(size: 38, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text("/\(snap.total)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.4))
            }
            .frame(width: 76)
            .padding(.vertical, 14)

            Rectangle().fill(.white.opacity(0.1)).frame(width: 1).padding(.vertical, 12)

            VStack(alignment: .leading, spacing: 8) {
                ForEach(topHabits) { h in HabitRow(habit: h) }
                if snap.habits.count > 3 {
                    Text("+ \(snap.habits.count - 3) more")
                        .font(.system(size: 10))
                        .foregroundStyle(.white.opacity(0.28))
                }
                Spacer(minLength: 0)
            }
            .padding(.leading, 12).padding(.trailing, 14).padding(.vertical, 12)

            Spacer(minLength: 0)
        }
        .background(bg)
    }
}

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

// ─────────────────────────────── Entry view ──────────────────────────────────

struct SproutWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: SproutEntry
    var body: some View {
        switch family {
        case .systemSmall:          SmallView(snap: entry.snap)
        case .systemMedium:         MediumView(snap: entry.snap)
        case .accessoryCircular:    CircularView(snap: entry.snap)
        case .accessoryRectangular: RectangularView(snap: entry.snap)
        default:                    SmallView(snap: entry.snap)
        }
    }
}

// ─────────────────────────────── Widget ──────────────────────────────────────

struct SproutWidget: Widget {
    let kind = "SproutWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SproutProvider()) { entry in
            SproutWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Sprout")
        .description("Today's habit progress at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular])
    }
}
