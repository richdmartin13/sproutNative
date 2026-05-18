import SwiftUI

struct WatchSettingsView: View {
    @EnvironmentObject var model: WatchDataModel
    @Binding var showGrid: Bool
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {

                // View mode + sync row
                Text("VIEW")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.secondary)

                HStack(spacing: 6) {
                    Button {
                        withAnimation(.spring(duration: 0.25)) { showGrid = false }
                    } label: {
                        Image(systemName: "list.bullet")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(showGrid ? .secondary : model.watchPrefs.accentColor)

                    Button {
                        withAnimation(.spring(duration: 0.25)) { showGrid = true }
                    } label: {
                        Image(systemName: "square.grid.2x2")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(showGrid ? model.watchPrefs.accentColor : .secondary)

                    Button {
                        model.requestUpdate()
                        dismiss()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .tint(model.watchPrefs.accentColor)
                }

                // Category filter — only shown when categories exist
                if !model.watchPrefs.categories.isEmpty {
                    Divider()
                        .padding(.vertical, 2)

                    Text("CATEGORY")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.secondary)

                    Button {
                        model.selectedCategory = nil
                        dismiss()
                    } label: {
                        Text("All")
                            .font(.system(size: 13, weight: .semibold))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .buttonStyle(.bordered)
                    .tint(model.selectedCategory == nil ? model.watchPrefs.accentColor : .secondary)

                    ForEach(model.watchPrefs.categories, id: \.self) { cat in
                        Button {
                            model.selectedCategory = cat
                            dismiss()
                        } label: {
                            Text(cat)
                                .font(.system(size: 13, weight: .semibold))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.bordered)
                        .tint(model.selectedCategory == cat ? model.watchPrefs.accentColor : .secondary)
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
        }
        .navigationTitle("Settings")
    }
}
