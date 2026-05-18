import SwiftUI

struct CategoryPickerView: View {
    @EnvironmentObject var model: WatchDataModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                Text("CATEGORY")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 2)

                catRow(nil)

                if model.watchPrefs.categories.isEmpty {
                    Text("Add categories to habits in the iPhone app.")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.top, 4)
                } else {
                    ForEach(model.watchPrefs.categories, id: \.self) { cat in
                        catRow(cat)
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
        }
        .navigationTitle("Filter")
    }

    @ViewBuilder
    private func catRow(_ cat: String?) -> some View {
        let isSelected = model.selectedCategory == cat
        let accent = model.watchPrefs.accentColor
        Button {
            model.selectedCategory = cat
            dismiss()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 14))
                    .foregroundStyle(isSelected ? accent : .secondary)
                Text(cat ?? "All")
                    .font(.system(size: 14, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? accent : .primary)
                Spacer()
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 10)
            .background(isSelected ? accent.opacity(0.15) : Color(white: 0.13))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? accent.opacity(0.45) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
