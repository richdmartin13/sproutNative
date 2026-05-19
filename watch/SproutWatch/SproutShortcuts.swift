import AppIntents

// ──────────────────────────── Open Sprout ────────────────────────────────────

struct OpenSproutIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Sprout"
    static var description = IntentDescription("Open the Sprout habit tracker")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult { .result() }
}

// ──────────────────────────── Today's Progress ───────────────────────────────

// Reads from the App Group that WatchDataModel persists to on every sync.
struct TodayProgressWatchIntent: AppIntent {
    static var title: LocalizedStringResource = "Today's Habit Progress"
    static var description = IntentDescription("See how many habits you've completed today")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let (logged, total) = readWatchProgress()
        guard total > 0 else {
            return .result(dialog: "No active habits yet. Open Sprout to add some.")
        }
        let pct = logged * 100 / total
        let cue: String
        switch pct {
        case 100: cue = "Perfect day!"
        case 75...: cue = "Almost there!"
        case 50...: cue = "Keep going."
        default: cue = "You've got this."
        }
        return .result(dialog: "\(logged) of \(total) habits done today. \(cue)")
    }
}

private func readWatchProgress() -> (Int, Int) {
    guard
        let defaults = UserDefaults(suiteName: "group.sprout.richdmart.in"),
        let data     = defaults.data(forKey: "sprout_watch_habits")
    else { return (0, 0) }
    struct H: Codable { let type: String; let todayCount: Int }
    guard let habits = try? JSONDecoder().decode([H].self, from: data) else { return (0, 0) }
    let logged = habits.filter { $0.type == "st" ? $0.todayCount == 0 : $0.todayCount > 0 }.count
    return (logged, habits.count)
}

// ──────────────────────────── Shortcuts provider ─────────────────────────────

struct SproutShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenSproutIntent(),
            phrases: [
                "Open \(.applicationName)",
                "Log habits in \(.applicationName)",
            ],
            shortTitle: "Open Sprout",
            systemImageName: "leaf.circle.fill"
        )
        AppShortcut(
            intent: TodayProgressWatchIntent(),
            phrases: [
                "How are my \(.applicationName) habits",
                "Check my \(.applicationName) progress",
            ],
            shortTitle: "Today's Progress",
            systemImageName: "chart.bar.fill"
        )
    }
}
