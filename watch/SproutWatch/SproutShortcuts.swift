import AppIntents

/// Makes "Open Sprout" available as a Siri Shortcut and in the Shortcuts app.
/// Users can add it to their watch face via a Shortcut complication.
struct OpenSproutIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Sprout"
    static var description = IntentDescription("Open the Sprout habit tracker")
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

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
    }
}
