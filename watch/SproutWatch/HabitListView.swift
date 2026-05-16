import SwiftUI

struct HabitListView: View {
    @EnvironmentObject var model: WatchDataModel

    var body: some View {
        Group {
            if model.isLoading {
                VStack(spacing: 10) {
                    ProgressView()
                        .progressViewStyle(.circular)
                    Text("Syncing…")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else if model.habits.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "leaf.circle.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(.green)
                    Text(model.isReachable
                         ? "No habits yet.\nOpen Sprout on iPhone."
                         : "iPhone out of range.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            } else {
                List(model.habits) { habit in
                    NavigationLink(destination: QuickLogView(habit: habit)) {
                        HabitRowView(habit: habit)
                    }
                }
                .listStyle(.carousel)
            }
        }
        .onAppear { model.requestUpdate() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    model.requestUpdate()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.caption)
                }
            }
        }
    }
}
