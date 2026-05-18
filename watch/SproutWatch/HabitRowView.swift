import SwiftUI

struct HabitRowView: View {
    let habit: WatchHabit

    private var typeColor: Color {
        switch habit.type {
        case "go": return Color(red: 0.20, green: 0.78, blue: 0.35)
        case "st": return Color(red: 0.98, green: 0.36, blue: 0.36)
        default:   return Color(red: 0.40, green: 0.65, blue: 0.95)
        }
    }

    var body: some View {
        HStack(spacing: 0) {
            // Left-edge color bar
            typeColor
                .frame(width: 4)
                .clipShape(UnevenRoundedRectangle(
                    topLeadingRadius: 12, bottomLeadingRadius: 12,
                    bottomTrailingRadius: 0, topTrailingRadius: 0
                ))

            // Content
            VStack(alignment: .leading, spacing: 3) {
                Text(habit.name)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)

                HStack(spacing: 6) {
                    if habit.todayCount > 0 {
                        Label("\(habit.todayCount)", systemImage: "checkmark.circle.fill")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.green)
                    }
                    if habit.type == "st", let d = habit.daysSince {
                        Label("\(d)d free", systemImage: "clock.fill")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.orange)
                    } else if habit.streak > 1 {
                        Label("\(habit.streak)", systemImage: "flame.fill")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.orange)
                    }
                }
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 10)
        }
        .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
        .background(Color.primary.opacity(0.07))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .contentShape(Rectangle())
    }
}
