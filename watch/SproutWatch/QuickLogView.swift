import SwiftUI
import WatchKit

struct QuickLogView: View {
    @EnvironmentObject var model: WatchDataModel
    let habit: WatchHabit

    // nil = no action yet | "logged" = gave in / logged | "resisted" = resisted
    @State private var logAction: String? = nil
    @State private var dismissWork: DispatchWorkItem?
    @Environment(\.dismiss) private var dismiss

    private var isStop: Bool { habit.type == "st" }

    private var typeColor: Color {
        switch habit.type {
        case "go": return Color(red: 0.20, green: 0.78, blue: 0.35)
        case "st": return Color(red: 0.98, green: 0.36, blue: 0.36)
        default:   return Color(red: 0.40, green: 0.65, blue: 0.95)
        }
    }

    var body: some View {
        VStack(spacing: 0) {

            // ── Full-screen tap zone ────────────────────────────────────
            Button(action: primaryTap) {
                VStack(spacing: 8) {
                    Spacer(minLength: 0)

                    ZStack {
                        Circle()
                            .fill(circleColor.opacity(0.20))
                            .frame(width: 54, height: 54)
                        Image(systemName: circleIcon)
                            .font(.system(size: 30))
                            .foregroundStyle(circleColor)
                            .animation(.spring(duration: 0.3), value: logAction)
                    }

                    Text(habit.name)
                        .font(.system(size: 15, weight: .semibold))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)

                    if let action = logAction {
                        Text(action == "resisted" ? "Resisted ✓" : (isStop ? "Gave in ✓" : "Logged! ✓"))
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(action == "resisted" ? Color.green : (isStop ? Color.orange : Color.green))
                            .transition(.scale.combined(with: .opacity))
                    } else if model.watchPrefs.showStats {
                        statsRow
                            .transition(.opacity)
                    }

                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // ── Bottom action buttons ──────────────────────────────────
            if logAction != nil {
                Button(action: undoLog) {
                    Label("Undo", systemImage: "arrow.uturn.backward")
                        .font(.system(size: 12, weight: .medium))
                }
                .buttonStyle(.bordered)
                .tint(.orange)
                .padding(.bottom, 2)
            } else if isStop {
                // Stop habits: primary tap = "Gave in", button = "Resisted"
                Button(action: resistTap) {
                    Label("Resisted", systemImage: "hand.raised.fill")
                        .font(.system(size: 13, weight: .semibold))
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .padding(.bottom, 2)
            } else {
                Button(action: primaryTap) {
                    Label("Log it", systemImage: "checkmark")
                        .font(.system(size: 13, weight: .semibold))
                }
                .buttonStyle(.borderedProminent)
                .tint(typeColor)
                .padding(.bottom, 2)
            }
        }
        .padding(.horizontal, 8)
        .padding(.top, 6)
        .navigationBarTitleDisplayMode(.inline)
    }

    // ── Computed icon / color based on state ───────────────────────────

    private var circleIcon: String {
        guard let action = logAction else {
            return isStop ? "xmark.circle.fill" : "plus.circle.fill"
        }
        return action == "resisted" ? "hand.raised.circle.fill" : "checkmark.circle.fill"
    }

    private var circleColor: Color {
        guard let action = logAction else { return typeColor }
        return action == "resisted" ? Color.green : (isStop ? Color.orange : Color.green)
    }

    // ── Stats row ──────────────────────────────────────────────────────

    @ViewBuilder private var statsRow: some View {
        HStack(spacing: 12) {
            if habit.todayCount > 0 {
                statPill(value: "\(habit.todayCount)", label: "today")
            }
            if isStop, let d = habit.daysSince {
                statPill(value: "\(d)d", label: "free", color: .orange)
            } else if habit.streak > 1 {
                statPill(value: "\(habit.streak)d", label: "streak", color: .orange)
            }
        }
    }

    private func statPill(value: String, label: String, color: Color = .primary) -> some View {
        VStack(spacing: 1) {
            Text(value).font(.system(size: 15, weight: .bold)).foregroundStyle(color)
            Text(label).font(.system(size: 9)).foregroundStyle(.secondary)
        }
    }

    // ── Actions ────────────────────────────────────────────────────────

    private func primaryTap() {
        dismissWork?.cancel()
        withAnimation(.spring(duration: 0.3)) { logAction = "logged" }
        model.logHabit(habit.id)
        scheduleDismiss()
    }

    private func resistTap() {
        dismissWork?.cancel()
        withAnimation(.spring(duration: 0.3)) { logAction = "resisted" }
        model.resistHabit(habit.id)
        scheduleDismiss()
    }

    private func undoLog() {
        dismissWork?.cancel()
        model.undoHabit(habit.id)
        dismiss()
    }

    private func scheduleDismiss() {
        let delay = model.watchPrefs.dismissDelay
        guard delay > 0 else { return }
        let work = DispatchWorkItem { dismiss() }
        dismissWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }
}
