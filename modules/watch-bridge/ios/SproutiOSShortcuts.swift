import AppIntents

// Reads from the App Group that SproutWatchBridge writes to on every sync.
private func readiOSProgress() -> (logged: Int, total: Int) {
    guard
        let defaults = UserDefaults(suiteName: "group.sprout.richdmart.in"),
        let data     = defaults.data(forKey: "sprout_habits")
    else { return (0, 0) }
    struct H: Codable { let type: String; let todayCount: Int }
    guard let habits = try? JSONDecoder().decode([H].self, from: data) else { return (0, 0) }
    let logged = habits.filter { $0.type == "st" ? $0.todayCount == 0 : $0.todayCount > 0 }.count
    return (logged, habits.count)
}

struct TodayProgressIntent: AppIntent {
    static var title: LocalizedStringResource = "Today's Habit Progress"
    static var description = IntentDescription("See how many habits you've completed today")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let (logged, total) = readiOSProgress()
        guard total > 0 else {
            return .result(dialog: "You don't have any active habits yet. Open Sprout to add some.")
        }
        let pct = logged * 100 / total
        let encouragement: String
        switch pct {
        case 100: encouragement = "You've hit 100%! Perfect day."
        case 75...: encouragement = "Almost there — keep going!"
        case 50...: encouragement = "Halfway done, keep it up."
        default:   encouragement = "You've got this."
        }
        return .result(dialog: "\(logged) of \(total) habits done today. \(encouragement)")
    }
}

struct SproutiOSShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TodayProgressIntent(),
            phrases: [
                "How are my \(.applicationName) habits",
                "Check my \(.applicationName) progress",
                "Habit check in \(.applicationName)",
            ],
            shortTitle: "Today's Progress",
            systemImageName: "chart.bar.fill"
        )
    }
}
