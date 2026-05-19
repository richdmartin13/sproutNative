import WidgetKit
import SwiftUI

private let APP_GROUP = "group.sprout.richdmart.in"

// ─────────────────────────────── Data ────────────────────────────────────────

private struct WH: Codable { let type: String; let todayCount: Int; let streak: Int }

struct WatchWidgetSnap {
    let loggedToday: Int
    let total: Int
    let topStreak: (name: String, days: Int)?

    static let placeholder = WatchWidgetSnap(loggedToday: 5, total: 8, topStreak: ("Morning run", 12))
}

private func readWatchSnap() -> WatchWidgetSnap {
    guard
        let defaults = UserDefaults(suiteName: APP_GROUP),
        let data     = defaults.data(forKey: "sprout_watch_habits"),
        let habits   = try? JSONDecoder().decode([WatchWidgetHabit].self, from: data)
    else { return .placeholder }

    let logged = habits.filter { $0.type == "st" ? $0.todayCount == 0 : $0.todayCount > 0 }.count
    let top    = habits.filter { $0.streak > 1 }.max { $0.streak < $1.streak }
    return WatchWidgetSnap(loggedToday: logged, total: habits.count,
                           topStreak: top.map { ($0.name, $0.streak) })
}

private struct WatchWidgetHabit: Codable {
    let name: String; let type: String; let todayCount: Int; let streak: Int
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

// ─────────────────────────────── Complication views ──────────────────────────

private struct CircularView: View {
    let snap: WatchWidgetSnap
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
    let snap: WatchWidgetSnap
    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: "leaf.fill").font(.system(size: 12)).widgetAccentable()
            VStack(alignment: .leading, spacing: 0) {
                Text("\(snap.loggedToday)/\(snap.total) habits")
                    .font(.system(size: 13, weight: .semibold))
                if let (name, days) = snap.topStreak {
                    Text("\(name) · \(days)d")
                        .font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
        }.widgetAccentable()
    }
}

private struct InlineView: View {
    let snap: WatchWidgetSnap
    var body: some View {
        Label("\(snap.loggedToday)/\(snap.total)", systemImage: "leaf.fill").widgetAccentable()
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
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}
