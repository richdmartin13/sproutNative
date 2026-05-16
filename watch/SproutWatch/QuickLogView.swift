import SwiftUI
import WatchKit

struct QuickLogView: View {
    @EnvironmentObject var model: WatchDataModel
    let habit: WatchHabit

    @State private var logged = false
    @Environment(\.dismiss) private var dismiss

    private var typeColor: Color {
        switch habit.type {
        case "go": return Color(red: 0.20, green: 0.78, blue: 0.35)
        case "st": return Color(red: 0.98, green: 0.36, blue: 0.36)
        default:   return Color(red: 0.40, green: 0.65, blue: 0.95)
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                // Icon
                ZStack {
                    Circle()
                        .fill(typeColor.opacity(0.18))
                        .frame(width: 56, height: 56)
                    Image(systemName: logged
                          ? "checkmark.circle.fill"
                          : (habit.type == "st" ? "xmark.circle.fill" : "plus.circle.fill"))
                        .font(.system(size: 30))
                        .foregroundStyle(logged ? .green : typeColor)
                        .animation(.spring(duration: 0.3), value: logged)
                }

                // Name
                Text(habit.name)
                    .font(.system(size: 15, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)

                // Stats row
                HStack(spacing: 12) {
                    if habit.todayCount > 0 {
                        VStack(spacing: 2) {
                            Text("\(habit.todayCount)")
                                .font(.system(size: 16, weight: .bold))
                            Text("today")
                                .font(.system(size: 9))
                                .foregroundStyle(.secondary)
                        }
                    }
                    if habit.type == "st", let d = habit.daysSince {
                        VStack(spacing: 2) {
                            Text("\(d)")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.orange)
                            Text("days free")
                                .font(.system(size: 9))
                                .foregroundStyle(.secondary)
                        }
                    } else if habit.streak > 1 {
                        VStack(spacing: 2) {
                            Text("\(habit.streak)")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.orange)
                            Text("streak")
                                .font(.system(size: 9))
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Action button
                if logged {
                    Label("Logged!", systemImage: "checkmark")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.green)
                        .transition(.scale.combined(with: .opacity))
                } else {
                    Button {
                        withAnimation { logged = true }
                        model.logHabit(habit.id)
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1.3) {
                            dismiss()
                        }
                    } label: {
                        Label(habit.type == "st" ? "Resisted" : "Log it",
                              systemImage: habit.type == "st" ? "hand.raised.fill" : "checkmark")
                            .font(.system(size: 14, weight: .semibold))
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(typeColor)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 10)
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}
