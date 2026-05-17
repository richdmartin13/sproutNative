import SwiftUI
import WatchKit

struct QuickLogView: View {
    @EnvironmentObject var model: WatchDataModel
    let habit: WatchHabit

    @State private var logged = false
    @State private var dismissWork: DispatchWorkItem?
    @Environment(\.dismiss) private var dismiss

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
            Button(action: tapToLog) {
                VStack(spacing: 8) {
                    Spacer(minLength: 0)

                    ZStack {
                        Circle()
                            .fill(logged ? Color.green.opacity(0.25) : typeColor.opacity(0.18))
                            .frame(width: 54, height: 54)
                        Image(systemName: logged
                              ? "checkmark.circle.fill"
                              : (habit.type == "st" ? "xmark.circle.fill" : "plus.circle.fill"))
                            .font(.system(size: 30))
                            .foregroundStyle(logged ? Color.green : typeColor)
                            .animation(.spring(duration: 0.3), value: logged)
                    }

                    Text(habit.name)
                        .font(.system(size: 15, weight: .semibold))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)

                    if logged {
                        Text(habit.type == "st" ? "Resisted ✓" : "Logged! ✓")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(.green)
                            .transition(.scale.combined(with: .opacity))
                    } else {
                        statsRow
                            .transition(.opacity)
                    }

                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            // ── Option buttons ─────────────────────────────────────────
            if logged {
                Button(action: undoLog) {
                    Label("Undo", systemImage: "arrow.uturn.backward")
                        .font(.system(size: 12, weight: .medium))
                }
                .buttonStyle(.bordered)
                .tint(.orange)
                .padding(.bottom, 2)
            } else {
                Button(action: tapToLog) {
                    Label(habit.type == "st" ? "Resisted" : "Log it",
                          systemImage: habit.type == "st" ? "hand.raised.fill" : "checkmark")
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

    // ── Helpers ────────────────────────────────────────────────────────

    @ViewBuilder private var statsRow: some View {
        HStack(spacing: 12) {
            if habit.todayCount > 0 {
                statPill(value: "\(habit.todayCount)", label: "today")
            }
            if habit.type == "st", let d = habit.daysSince {
                statPill(value: "\(d)d", label: "free", color: .orange)
            } else if habit.streak > 1 {
                statPill(value: "\(habit.streak)d", label: "streak", color: .orange)
            }
        }
    }

    private func statPill(value: String, label: String, color: Color = .primary) -> some View {
        VStack(spacing: 1) {
            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(.secondary)
        }
    }

    private func tapToLog() {
        dismissWork?.cancel()
        withAnimation(.spring(duration: 0.3)) { logged = true }
        model.logHabit(habit.id)
        scheduleDismiss()
    }

    private func undoLog() {
        dismissWork?.cancel()
        model.undoHabit(habit.id)
        dismiss()
    }

    private func scheduleDismiss() {
        let work = DispatchWorkItem { dismiss() }
        dismissWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0, execute: work)
    }
}
