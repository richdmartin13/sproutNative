import SwiftUI

struct HabitListView: View {
    @EnvironmentObject var model: WatchDataModel
    @State private var showGrid = false

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
                        .foregroundStyle(model.watchPrefs.accentColor)
                    Text(model.isReachable
                         ? "No habits yet.\nOpen Sprout on iPhone."
                         : "iPhone out of range.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {

                        // Hourly sparkline — always shown, fades in when data arrives
                        let hourly = model.watchPrefs.hourlyActivity
                        HourlyActivityView(counts: hourly, accentColor: model.watchPrefs.accentColor)
                            .padding(.horizontal, 2)

                        // Grid or list
                        if showGrid {
                            LazyVGrid(
                                columns: [GridItem(.flexible()), GridItem(.flexible())],
                                spacing: 8
                            ) {
                                ForEach(model.habits) { habit in
                                    NavigationLink(destination: QuickLogView(habit: habit)) {
                                        HabitGridTile(habit: habit, showCategory: model.watchPrefs.showCategory)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        } else {
                            LazyVStack(spacing: 6) {
                                ForEach(model.habits) { habit in
                                    NavigationLink(destination: QuickLogView(habit: habit)) {
                                        HabitRowView(habit: habit, showCategory: model.watchPrefs.showCategory)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                }
            }
        }
        .onAppear {
            model.requestUpdate()
            showGrid = model.watchPrefs.showGrid
        }
        .onChange(of: model.watchPrefs.showGrid) { _, newVal in
            showGrid = newVal
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    withAnimation(.spring(duration: 0.25)) { showGrid.toggle() }
                } label: {
                    Image(systemName: showGrid ? "list.bullet" : "square.grid.2x2")
                        .foregroundStyle(.white)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    model.requestUpdate()
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .foregroundStyle(.white)
                }
            }
        }
    }
}
