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
        HStack(spacing: 8) {
            // Type dot — mirrors grid tile
            Circle()
                .fill(typeColor)
                .frame(width: 6, height: 6)

            // Habit name
            Text(habit.name)
                .font(.system(size: 13, weight: .semibold))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Right side: count or streak/days
            VStack(alignment: .trailing, spacing: 2) {
                if habit.todayCount > 0 {
                    Text("\(habit.todayCount)")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundStyle(typeColor)
                }
                if habit.type == "st", let d = habit.daysSince {
                    Label("\(d)d", systemImage: "clock")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.orange)
                } else if habit.streak > 1 {
                    Label("\(habit.streak)", systemImage: "flame.fill")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.orange)
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .background(typeColor.opacity(0.14))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(typeColor.opacity(0.30), lineWidth: 0.5))
        .contentShape(Rectangle())
    }
}
