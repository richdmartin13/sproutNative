import SwiftUI

struct HabitListView: View {
    @EnvironmentObject var model: WatchDataModel
    @State private var showGrid = false
    @State private var showSettings = false

    private var visibleHabits: [WatchHabit] {
        guard let cat = model.selectedCategory else { return model.habits }
        return model.habits.filter { $0.category == cat }
    }

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

                        // Active category indicator
                        if let cat = model.selectedCategory {
                            HStack(spacing: 4) {
                                Text(cat)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(model.watchPrefs.accentColor)
                                    .lineLimit(1)
                                Spacer()
                                Button {
                                    model.selectedCategory = nil
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 12))
                                        .foregroundStyle(.secondary)
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.horizontal, 2)
                        }

                        // Empty category state
                        if visibleHabits.isEmpty {
                            VStack(spacing: 8) {
                                Text("No habits in this category.")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                                Button {
                                    model.selectedCategory = nil
                                } label: {
                                    Text("Show all")
                                        .font(.system(size: 12, weight: .semibold))
                                }
                                .tint(model.watchPrefs.accentColor)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 8)
                        } else if showGrid {
                            LazyVGrid(
                                columns: [GridItem(.flexible()), GridItem(.flexible())],
                                spacing: 8
                            ) {
                                ForEach(visibleHabits) { habit in
                                    NavigationLink(destination: QuickLogView(habit: habit)) {
                                        HabitGridTile(habit: habit, showCategory: model.watchPrefs.showCategory)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        } else {
                            LazyVStack(spacing: 6) {
                                ForEach(visibleHabits) { habit in
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
        .sheet(isPresented: $showSettings) {
            WatchSettingsView(showGrid: $showGrid)
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "slider.horizontal.3")
                        .foregroundStyle(.white)
                }
            }
        }
    }
}
