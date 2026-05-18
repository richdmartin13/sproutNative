import Foundation
import WatchConnectivity
import WatchKit
import SwiftUI

struct WatchHabit: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let type: String        // "go" | "st" | "ne"
    let todayCount: Int
    let streak: Int
    let daysSince: Int?     // non-nil for "st" habits
    let category: String
}

struct WatchPrefs: Codable {
    var dismissDelay: Double
    var haptic: Bool
    var showStats: Bool
    var showGrid: Bool
    var showCategory: Bool
    var hourlyActivity: [Int]   // 24 values — total logs per hour for today
    var accentHex: String       // e.g. "#2d6e47"
    var isDark: Bool

    init(dismissDelay: Double = 2.0, haptic: Bool = true, showStats: Bool = true,
         showGrid: Bool = false, showCategory: Bool = true,
         hourlyActivity: [Int] = Array(repeating: 0, count: 24),
         accentHex: String = "#2d6e47", isDark: Bool = true) {
        self.dismissDelay    = dismissDelay
        self.haptic          = haptic
        self.showStats       = showStats
        self.showGrid        = showGrid
        self.showCategory    = showCategory
        self.hourlyActivity  = hourlyActivity
        self.accentHex       = accentHex
        self.isDark          = isDark
    }

    // Tolerant decode — new keys fall back to defaults so old builds keep working
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        dismissDelay   = try c.decodeIfPresent(Double.self, forKey: .dismissDelay)   ?? 2.0
        haptic         = try c.decodeIfPresent(Bool.self,   forKey: .haptic)         ?? true
        showStats      = try c.decodeIfPresent(Bool.self,   forKey: .showStats)      ?? true
        showGrid       = try c.decodeIfPresent(Bool.self,   forKey: .showGrid)       ?? false
        showCategory   = try c.decodeIfPresent(Bool.self,   forKey: .showCategory)   ?? true
        hourlyActivity = try c.decodeIfPresent([Int].self,  forKey: .hourlyActivity) ?? Array(repeating: 0, count: 24)
        accentHex      = try c.decodeIfPresent(String.self, forKey: .accentHex)      ?? "#2d6e47"
        isDark         = try c.decodeIfPresent(Bool.self,   forKey: .isDark)         ?? true
    }

    var accentColor: Color { Color(hex: accentHex) }
}

// Hex color initializer for SwiftUI Color
extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: h).scanHexInt64(&int)
        let r, g, b: UInt64
        switch h.count {
        case 3:  (r, g, b) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:  (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default: (r, g, b) = (0, 0, 0)
        }
        self.init(.sRGB, red: Double(r)/255, green: Double(g)/255, blue: Double(b)/255)
    }
}

class WatchDataModel: NSObject, ObservableObject {
    @Published var habits: [WatchHabit] = []
    @Published var watchPrefs = WatchPrefs()
    @Published var isReachable = false
    @Published var isLoading = true

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func requestUpdate() {
        guard WCSession.default.activationState == .activated else { return }
        applyContext(WCSession.default.receivedApplicationContext)
        guard WCSession.default.isReachable else {
            DispatchQueue.main.async { self.isLoading = false }
            return
        }
        WCSession.default.sendMessage(["action": "getHabits"], replyHandler: { reply in
            self.handlePayload(reply)
        }, errorHandler: { _ in
            DispatchQueue.main.async { self.isLoading = false }
        })
    }

    func logHabit(_ id: String) {
        if watchPrefs.haptic { WKInterfaceDevice.current().play(.click) }
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["action": "logHabit", "id": id],
            replyHandler: { [weak self] _ in self?.requestUpdate() },
            errorHandler: nil
        )
    }

    func resistHabit(_ id: String) {
        if watchPrefs.haptic { WKInterfaceDevice.current().play(.success) }
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["action": "resistHabit", "id": id],
            replyHandler: { [weak self] _ in self?.requestUpdate() },
            errorHandler: nil
        )
    }

    func undoHabit(_ id: String) {
        if watchPrefs.haptic { WKInterfaceDevice.current().play(.click) }
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["action": "undoHabit", "id": id],
            replyHandler: { [weak self] _ in self?.requestUpdate() },
            errorHandler: nil
        )
    }

    private func handlePayload(_ payload: [String: Any]) {
        if let data = payload["habits"] as? Data,
           let decoded = try? JSONDecoder().decode([WatchHabit].self, from: data) {
            DispatchQueue.main.async {
                self.habits = decoded
                self.isLoading = false
            }
        }
        if let pd = payload["watchPrefs"] as? Data,
           let decoded = try? JSONDecoder().decode(WatchPrefs.self, from: pd) {
            DispatchQueue.main.async { self.watchPrefs = decoded }
        }
    }

    private func applyContext(_ ctx: [String: Any]) {
        guard !ctx.isEmpty else { return }
        handlePayload(ctx)
    }
}

extension WatchDataModel: WCSessionDelegate {
    func session(_ session: WCSession,
                 activationDidCompleteWith state: WCSessionActivationState,
                 error: Error?) {
        DispatchQueue.main.async { self.isReachable = session.isReachable }
        if state == .activated { requestUpdate() }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { self.isReachable = session.isReachable }
    }

    func session(_ session: WCSession,
                 didReceiveApplicationContext ctx: [String: Any]) {
        applyContext(ctx)
    }

    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any]) {
        handlePayload(message)
    }
}
