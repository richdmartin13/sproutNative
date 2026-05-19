import SwiftUI

struct HabitListView: View {
    @EnvironmentObject var model: WatchDataModel
    @State private var showSettings = false
    @State private var showCategoryPicker = false

    private var visibleHabits: [WatchHabit] {
        guard let cat = model.selectedCategory else { return model.habits }
        return model.habits.filter { $0.category == cat }
    }

    var body: some View {
        Group {
            if model.isLoading {
                VStack(spacing: 10) {
                    ProgressView().progressViewStyle(.circular)
                    Text("Syncing…").font(.caption2).foregroundStyle(.secondary)
                }
            } else if model.habits.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "leaf.circle.fill")
                        .font(.system(size: 36))
                        .foregroundStyle(model.watchPrefs.accentColor)
                    Text(model.isReachable
                         ? "No habits yet.\nOpen Sprout on iPhone."
                         : "iPhone out of range.")
                        .font(.caption2).foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {

                        HourlyActivityView(counts: model.watchPrefs.hourlyActivity,
                                           accentColor: model.watchPrefs.accentColor)
                            .padding(.horizontal, 2)

                        // Active category chip — tap to clear
                        if let cat = model.selectedCategory {
                            Button { model.selectedCategory = nil } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "line.3.horizontal.decrease.circle.fill")
                                        .font(.system(size: 11))
                                    Text(cat)
                                        .font(.system(size: 11, weight: .semibold))
                                        .lineLimit(1)
                                    Spacer()
                                    Image(systemName: "xmark")
                                        .font(.system(size: 10, weight: .semibold))
                                        .foregroundStyle(.secondary)
                                }
                                .foregroundStyle(model.watchPrefs.accentColor)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(model.watchPrefs.accentColor.opacity(0.14))
                                .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 2)
                        }

                        // Empty-category fallback
                        if visibleHabits.isEmpty {
                            VStack(spacing: 8) {
                                Text("No habits in this category.")
                                    .font(.caption2).foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                                Button { model.selectedCategory = nil } label: {
                                    Text("Show all").font(.system(size: 12, weight: .semibold))
                                }
                                .tint(model.watchPrefs.accentColor)
                            }
                            .frame(maxWidth: .infinity).padding(.top, 8)
                        } else if model.showGrid {
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                                ForEach(visibleHabits) { habit in
                                    NavigationLink(destination: QuickLogView(habit: habit)) {
                                        HabitGridTile(habit: habit, showCategory: model.showCategory)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        } else {
                            LazyVStack(spacing: 6) {
                                ForEach(visibleHabits) { habit in
                                    NavigationLink(destination: QuickLogView(habit: habit)) {
                                        HabitRowView(habit: habit, showCategory: model.showCategory)
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
        .onAppear { model.requestUpdate() }
        // Category picker — focused, fast-dismiss sheet
        .sheet(isPresented: $showCategoryPicker) {
            CategoryPickerView()
        }
        // Full settings sheet
        .sheet(isPresented: $showSettings) {
            WatchSettingsView()
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button { showCategoryPicker = true } label: {
                    Image(systemName: model.selectedCategory != nil
                          ? "line.3.horizontal.decrease.circle.fill"
                          : "line.3.horizontal.decrease.circle")
                        .foregroundStyle(.white)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { showSettings = true } label: {
                    Image(systemName: "slider.horizontal.3").foregroundStyle(.white)
                }
            }
        }
    }
}
