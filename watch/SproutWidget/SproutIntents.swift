import AppIntents
import WidgetKit

private let APP_GROUP = "group.sprout.richdmart.in"

// ─── Pending log queue ────────────────────────────────────────────────────────
// Written by widget intents; read + cleared by the main app on foreground.

struct PendingWidgetLog: Codable {
    let habitId: String
    let ts: TimeInterval
    let resist: Bool
}

private func appendPending(habitId: String, resist: Bool) {
    guard let d = UserDefaults(suiteName: APP_GROUP) else { return }
    var q = (try? JSONDecoder().decode([PendingWidgetLog].self,
              from: d.data(forKey: "sprout_pending_logs") ?? Data())) ?? []
    q.append(PendingWidgetLog(habitId: habitId, ts: Date().timeIntervalSince1970, resist: resist))
    d.set(try? JSONEncoder().encode(q), forKey: "sprout_pending_logs")
}

// Optimistically bumps todayCount in the cached snapshot so the widget
// reflects the tap immediately without waiting for the main app to sync.
private func bumpSnapshot(habitId: String) {
    guard let d = UserDefaults(suiteName: APP_GROUP),
          let data = d.data(forKey: "sprout_habits"),
          let habits = try? JSONDecoder().decode([WidgetHabit].self, from: data) else { return }
    let updated = habits.map { h -> WidgetHabit in
        guard h.id == habitId else { return h }
        return WidgetHabit(id: h.id, name: h.name, type: h.type, category: h.category,
                           todayCount: h.todayCount + 1, streak: h.streak, daysSince: h.daysSince)
    }
    d.set(try? JSONEncoder().encode(updated), forKey: "sprout_habits")
}

// ─── Log intent (widget buttons, iOS 17+) ────────────────────────────────────

@available(iOS 17.0, *)
struct WidgetLogIntent: AppIntent {
    static let title: LocalizedStringResource = "Log Habit"
    static let isDiscoverable = false

    @Parameter(title: "Habit ID")   var habitId: String
    @Parameter(title: "Habit Name") var habitName: String

    init() { habitId = ""; habitName = "" }
    init(id: String, name: String) { habitId = id; habitName = name }

    func perform() async throws -> some IntentResult {
        appendPending(habitId: habitId, resist: false)
        bumpSnapshot(habitId: habitId)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
