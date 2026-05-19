import SwiftUI

struct WatchSettingsView: View {
    @EnvironmentObject var model: WatchDataModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {

                // ── Layout ────────────────────────────────────────────────
                label("LAYOUT")
                HStack(spacing: 6) {
                    layoutBtn("list.bullet", activeIcon: "list.bullet", "List", selected: !model.showGrid) {
                        model.showGrid = false
                    }
                    layoutBtn("square.grid.2x2", activeIcon: "square.grid.2x2.fill", "Grid", selected: model.showGrid) {
                        model.showGrid = true
                    }
                }

                // ── Display ───────────────────────────────────────────────
                Divider().padding(.vertical, 2)
                label("DISPLAY")
                toggleRow("Show stats", on: model.showStats)  { model.showStats    = $0 }
                toggleRow("Show category", on: model.showCategory) { model.showCategory = $0 }

                // ── After logging ─────────────────────────────────────────
                Divider().padding(.vertical, 2)
                label("AUTO-DISMISS")
                HStack(spacing: 4) {
                    dismissBtn("1s",   1.0)
                    dismissBtn("2s",   2.0)
                    dismissBtn("5s",   5.0)
                    dismissBtn("Off",  0.0)
                }

                // ── Haptic ────────────────────────────────────────────────
                toggleRow("Haptic", on: model.haptic) { model.haptic = $0 }

                // ── Sync ──────────────────────────────────────────────────
                Divider().padding(.vertical, 2)
                Button {
                    model.requestUpdate()
                    dismiss()
                } label: {
                    Label("Sync from iPhone", systemImage: "arrow.clockwise")
                        .font(.system(size: 13, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(model.watchPrefs.accentColor)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
        }
        .navigationTitle("Settings")
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    @ViewBuilder
    private func label(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(.secondary)
    }

    @ViewBuilder
    private func layoutBtn(_ icon: String, activeIcon: String, _ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        let accent = model.watchPrefs.accentColor
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: selected ? activeIcon : icon)
                    .font(.system(size: 15, weight: .medium))
                Text(title)
                    .font(.system(size: 10, weight: selected ? .semibold : .regular))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 9)
            .background(selected ? accent.opacity(0.22) : Color(white: 0.18))
            .clipShape(RoundedRectangle(cornerRadius: 9))
            .overlay(
                RoundedRectangle(cornerRadius: 9)
                    .stroke(selected ? accent : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .foregroundStyle(selected ? accent : .secondary)
    }

    @ViewBuilder
    private func toggleRow(_ title: String, on value: Bool, onChange: @escaping (Bool) -> Void) -> some View {
        let accent = model.watchPrefs.accentColor
        Button { onChange(!value) } label: {
            HStack {
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.primary)
                Spacer()
                Image(systemName: value ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 15))
                    .foregroundStyle(value ? accent : .secondary)
            }
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func dismissBtn(_ label: String, _ value: Double) -> some View {
        let selected = model.dismissDelay == value
        let accent = model.watchPrefs.accentColor
        Button { model.dismissDelay = value } label: {
            Text(label)
                .font(.system(size: 11, weight: selected ? .semibold : .regular))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 7)
                .background(selected ? accent.opacity(0.22) : Color(white: 0.18))
                .clipShape(RoundedRectangle(cornerRadius: 7))
                .overlay(
                    RoundedRectangle(cornerRadius: 7)
                        .stroke(selected ? accent : Color.clear, lineWidth: 1.5)
                )
        }
        .buttonStyle(.plain)
        .foregroundStyle(selected ? accent : .secondary)
    }
}
