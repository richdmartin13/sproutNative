import SwiftUI

@main
struct SproutWatchApp: App {
    @StateObject private var model = WatchDataModel()

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HabitListView()
                    .navigationTitle("Sprout")
                    .navigationBarTitleDisplayMode(.large)
            }
            .environmentObject(model)
        }
    }
}
