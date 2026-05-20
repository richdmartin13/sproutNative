import AppIntents

private let APP_GROUP_ID = "group.sprout.richdmart.in"

// ─────────────────────────────── Data helpers ─────────────────────────────────

private struct RawHabit: Codable {
    let id, name, type: String
    let todayCount: Int
    let streak: Int
}

@available(iOS 16, *)
private func readHabits() -> [RawHabit] {
    guard
        let d    = UserDefaults(suiteName: APP_GROUP_ID),
        let data = d.data(forKey: "sprout_habits"),
        let list = try? JSONDecoder().decode([RawHabit].self, from: data)
    else { return [] }
    return list
}

@available(iOS 16, *)
private func readiOSProgress() -> (logged: Int, total: Int) {
    let habits = readHabits()
    let logged = habits.filter { $0.type == "st" ? $0.todayCount == 0 : $0.todayCount > 0 }.count
    return (logged, habits.count)
}

// ─────────────────────────────── HabitEntity ─────────────────────────────────

@available(iOS 16, *)
struct HabitEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Habit"
    static var defaultQuery = HabitQuery()

    let id: String
    let name: String

    var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

@available(iOS 16, *)
struct HabitQuery: EntityQuery {
    func entities(for ids: [String]) async throws -> [HabitEntity] {
        readHabits().filter { ids.contains($0.id) }.map { HabitEntity(id: $0.id, name: $0.name) }
    }
    func suggestedEntities() async throws -> [HabitEntity] {
        readHabits().map { HabitEntity(id: $0.id, name: $0.name) }
    }
}

// ─────────────────────────────── Intents ─────────────────────────────────────

@available(iOS 16, *)
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

@available(iOS 16, *)
struct CheckHabitIntent: AppIntent {
    static var title: LocalizedStringResource = "Check Habit Status"
    static var description = IntentDescription("Check whether a specific habit has been logged today")

    @Parameter(title: "Habit") var habit: HabitEntity

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let h = readHabits().first(where: { $0.id == habit.id }) else {
            return .result(dialog: "I couldn't find that habit.")
        }
        let done = h.type == "st" ? h.todayCount == 0 : h.todayCount > 0
        if done {
            return .result(dialog: "Yes — you've already logged \(h.name) today. Great work!")
        } else {
            return .result(dialog: "Not yet. You haven't logged \(h.name) today.")
        }
    }
}

@available(iOS 16, *)
struct GetStreakIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Habit Streak"
    static var description = IntentDescription("Check the current streak for a specific habit")

    @Parameter(title: "Habit") var habit: HabitEntity

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let h = readHabits().first(where: { $0.id == habit.id }) else {
            return .result(dialog: "I couldn't find that habit.")
        }
        guard h.streak > 0 else {
            return .result(dialog: "\(h.name) doesn't have an active streak yet. Log it today to start one!")
        }
        let days = h.streak == 1 ? "1 day" : "\(h.streak) days"
        return .result(dialog: "\(h.name) is on a \(days) streak. Keep it going!")
    }
}

// ─────────────────────────────── AppShortcutsProvider ────────────────────────

@available(iOS 16, *)
struct SproutiOSShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: TodayProgressIntent(),
            phrases: [
                "How are my \(.applicationName) habits",
                "Check my \(.applicationName) progress",
                "Habit check in \(.applicationName)",
                "How many \(.applicationName) habits have I done",
            ],
            shortTitle: "Today's Progress",
            systemImageName: "chart.bar.fill"
        )
        AppShortcut(
            intent: CheckHabitIntent(),
            phrases: [
                "Did I log \(\.$habit) in \(.applicationName)",
                "Have I done \(\.$habit) in \(.applicationName)",
                "Check my \(\.$habit) habit in \(.applicationName)",
            ],
            shortTitle: "Check a Habit",
            systemImageName: "checkmark.circle.fill"
        )
        AppShortcut(
            intent: GetStreakIntent(),
            phrases: [
                "What's my \(\.$habit) streak in \(.applicationName)",
                "How long is my \(\.$habit) streak in \(.applicationName)",
            ],
            shortTitle: "Habit Streak",
            systemImageName: "flame.fill"
        )
    }
}
