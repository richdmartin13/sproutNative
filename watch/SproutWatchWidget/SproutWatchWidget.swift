import WidgetKit
import SwiftUI

private let APP_GROUP = "group.sprout.richdmart.in"

// ─────────────────────────────── Data ────────────────────────────────────────

private struct WH: Codable {
    let id, name, type, category: String
    let todayCount, streak: Int
    let daysSince: Int?
}

private struct WatchHabitRow: Identifiable {
    let id: String   // habit name used as stable ID
    let done: Bool
    var name: String { id }
}

struct WatchWidgetSnap {
    let loggedToday: Int
    let total: Int
    let topStreak: (name: String, days: Int)?
    let topRows: [WatchHabitRow]
    let accentHex: String

    static let placeholder = WatchWidgetSnap(
        loggedToday: 5, total: 8,
        topStreak: ("Morning run", 12),
        topRows: [WatchHabitRow(id: "Morning Walk", done: true),
                  WatchHabitRow(id: "Read", done: false)],
        accentHex: "#2d6e47"
    )
}

private func readWatchSnap() -> WatchWidgetSnap {
    guard
        let defaults = UserDefaults(suiteName: APP_GROUP),
        let data     = defaults.data(forKey: "sprout_habits"),
        let habits   = try? JSONDecoder().decode([WH].self, from: data)
    else { return .placeholder }

    let accentHex  = defaults.string(forKey: "sprout_accent") ?? "#2d6e47"
    let logged     = habits.filter { $0.type == "st" ? $0.todayCount == 0 : $0.todayCount > 0 }.count
    let top        = habits.filter { $0.streak > 1 }.max { $0.streak < $1.streak }

    // Top 3 habits for the rectangular complication
    let rows = habits.prefix(3).map { h -> WatchHabitRow in
        let done = h.type == "st" ? h.todayCount == 0 : h.todayCount > 0
        return WatchHabitRow(id: h.name, done: done)
    }

    return WatchWidgetSnap(
        loggedToday: logged,
        total: habits.count,
        topStreak: top.map { ($0.name, $0.streak) },
        topRows: Array(rows),
        accentHex: accentHex
    )
}

// ─────────────────────────────── Timeline ────────────────────────────────────

struct WatchEntry: TimelineEntry {
    let date: Date
    let snap: WatchWidgetSnap
}

struct WatchProvider: TimelineProvider {
    func placeholder(in _: Context) -> WatchEntry { WatchEntry(date: .now, snap: .placeholder) }
    func getSnapshot(in _: Context, completion: @escaping (WatchEntry) -> Void) {
        completion(WatchEntry(date: .now, snap: readWatchSnap()))
    }
    func getTimeline(in _: Context, completion: @escaping (Timeline<WatchEntry>) -> Void) {
        let entry    = WatchEntry(date: .now, snap: readWatchSnap())
        let midnight = Calendar.current.startOfDay(for: .now).addingTimeInterval(86_400)
        completion(Timeline(entries: [entry], policy: .after(midnight)))
    }
}

// ─────────────────────────────── Colour helper ───────────────────────────────

private func accentColor(_ hex: String) -> Color {
    var h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    if h.count == 3 { h = h.map { "\($0)\($0)" }.joined() }
    guard h.count == 6, let v = UInt64(h, radix: 16) else { return Color.green }
    return Color(
        red:   Double((v >> 16) & 0xFF) / 255,
        green: Double((v >>  8) & 0xFF) / 255,
        blue:  Double( v        & 0xFF) / 255
    )
}

// ─────────────────────────────── Complication views ──────────────────────────

private struct CircularView: View {
    let snap: WatchWidgetSnap
    var body: some View {
        let accent = accentColor(snap.accentHex)
        ZStack {
            AccessoryWidgetBackground()
            Gauge(value: Double(snap.loggedToday),
                  in: 0...Double(max(snap.total, 1))) {
                Image(systemName: "leaf.fill")
            } currentValueLabel: {
                Text("\(snap.loggedToday)")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
            }
            .gaugeStyle(.accessoryCircular)
            .tint(accent)
        }
        .widgetAccentable()
    }
}

private struct CornerView: View {
    let snap: WatchWidgetSnap
    var body: some View {
        let accent = accentColor(snap.accentHex)
        ZStack {
            Gauge(value: Double(snap.loggedToday),
                  in: 0...Double(max(snap.total, 1))) {
                Image(systemName: "leaf.fill")
            }
            .gaugeStyle(.accessoryCircularCapacity)
            .tint(accent)
        }
        .widgetAccentable()
    }
}

private struct RectangularView: View {
    let snap: WatchWidgetSnap
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: "leaf.fill")
                    .font(.system(size: 10))
                    .widgetAccentable()
                Text("\(snap.loggedToday) of \(snap.total) done")
                    .font(.system(size: 12, weight: .semibold))
                Spacer(minLength: 0)
            }
            ForEach(snap.topRows.prefix(2)) { row in
                HStack(spacing: 4) {
                    Image(systemName: row.done ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 9))
                        .foregroundStyle(row.done ? .primary : .secondary)
                    Text(row.name)
                        .font(.system(size: 10))
                        .foregroundStyle(row.done ? .primary : .secondary)
                        .lineLimit(1)
                }
            }
        }
        .widgetAccentable()
    }
}

private struct InlineView: View {
    let snap: WatchWidgetSnap
    var body: some View {
        Label("\(snap.loggedToday)/\(snap.total)", systemImage: "leaf.fill")
            .widgetAccentable()
    }
}

// ─────────────────────────────── Entry view ──────────────────────────────────

struct SproutWatchWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: WatchEntry
    var body: some View {
        switch family {
        case .accessoryCircular:    CircularView(snap: entry.snap)
        case .accessoryRectangular: RectangularView(snap: entry.snap)
        case .accessoryCorner:      CornerView(snap: entry.snap)
        case .accessoryInline:      InlineView(snap: entry.snap)
        default:                    CircularView(snap: entry.snap)
        }
    }
}

// ─────────────────────────────── Widget ──────────────────────────────────────

struct SproutWatchWidget: Widget {
    let kind = "SproutWatchWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchProvider()) { entry in
            SproutWatchWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Sprout")
        .description("Habit progress on your watch face.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryCorner,
            .accessoryInline,
        ])
    }
}
