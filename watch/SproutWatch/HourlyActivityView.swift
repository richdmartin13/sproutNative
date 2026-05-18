import SwiftUI

/// Compact 24-bar sparkline showing today's log activity by hour.
struct HourlyActivityView: View {
    let counts: [Int]

    private var maxCount: Int { max(1, counts.max() ?? 1) }

    private var currentHour: Int {
        Calendar.current.component(.hour, from: Date())
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 1.5) {
            ForEach(0..<24, id: \.self) { hour in
                let count = hour < counts.count ? counts[hour] : 0
                let fraction = CGFloat(count) / CGFloat(maxCount)
                let barH: CGFloat = count > 0 ? max(4, fraction * 20) : 2
                let isCurrent = hour == currentHour

                RoundedRectangle(cornerRadius: 1)
                    .fill(count > 0
                          ? Color.green.opacity(isCurrent ? 1.0 : 0.65)
                          : Color.primary.opacity(isCurrent ? 0.25 : 0.12))
                    .frame(width: 4, height: barH)
                    .overlay(
                        isCurrent
                            ? RoundedRectangle(cornerRadius: 1)
                                .stroke(Color.white.opacity(0.55), lineWidth: 0.5)
                            : nil
                    )
            }
        }
        .frame(height: 24, alignment: .bottom)
        .frame(maxWidth: .infinity)
    }
}
