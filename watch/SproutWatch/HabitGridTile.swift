import SwiftUI

struct HabitGridTile: View {
    let habit: WatchHabit
    var showCategory: Bool = true

    private var typeColor: Color {
        switch habit.type {
        case "go": return Color(red: 0.20, green: 0.78, blue: 0.35)
        case "st": return Color(red: 0.98, green: 0.36, blue: 0.36)
        default:   return Color(red: 0.40, green: 0.65, blue: 0.95)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .top) {
                Circle()
                    .fill(typeColor)
                    .frame(width: 6, height: 6)
                    .padding(.top, 2)
                Spacer()
                if habit.todayCount > 0 {
                    Text("\(habit.todayCount)")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(typeColor)
                }
            }

            Text(habit.name)
                .font(.system(size: 11, weight: .semibold))
                .lineLimit(2)
                .foregroundStyle(.primary)

            if showCategory && !habit.category.isEmpty {
                Text(habit.category)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)

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
        .padding(10)
        .frame(maxWidth: .infinity, minHeight: 70, alignment: .topLeading)
        .background {
            RoundedRectangle(cornerRadius: 14).fill(.regularMaterial)
            RoundedRectangle(cornerRadius: 14).fill(typeColor.opacity(0.10))
            RoundedRectangle(cornerRadius: 14).strokeBorder(typeColor.opacity(0.28), lineWidth: 0.5)
        }
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
