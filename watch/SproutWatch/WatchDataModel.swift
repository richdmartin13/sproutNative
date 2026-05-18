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
    var categories: [String]    // available categories from active iPhone habits
    var hourlyActivity: [Int]   // 24 values — total logs per hour for today
    var accentHex: String       // e.g. "#2d6e47"
    var isDark: Bool

    // Legacy fields — still decoded so old iPhone builds don't break wire format
    var dismissDelay: Double
    var haptic: Bool
    var showStats: Bool
    var showGrid: Bool
    var showCategory: Bool

    init(categories: [String] = [], hourlyActivity: [Int] = Array(repeating: 0, count: 24),
         accentHex: String = "#2d6e47", isDark: Bool = true,
         dismissDelay: Double = 2.0, haptic: Bool = true, showStats: Bool = true,
         showGrid: Bool = false, showCategory: Bool = true) {
        self.categories      = categories
        self.hourlyActivity  = hourlyActivity
        self.accentHex       = accentHex
        self.isDark          = isDark
        self.dismissDelay    = dismissDelay
        self.haptic          = haptic
        self.showStats       = showStats
        self.showGrid        = showGrid
        self.showCategory    = showCategory
    }

    // Tolerant decode — new keys fall back to defaults so old builds keep working
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        categories     = try c.decodeIfPresent([String].self, forKey: .categories)     ?? []
        hourlyActivity = try c.decodeIfPresent([Int].self,    forKey: .hourlyActivity) ?? Array(repeating: 0, count: 24)
        accentHex      = try c.decodeIfPresent(String.self,   forKey: .accentHex)      ?? "#2d6e47"
        isDark         = try c.decodeIfPresent(Bool.self,     forKey: .isDark)         ?? true
        dismissDelay   = try c.decodeIfPresent(Double.self,   forKey: .dismissDelay)   ?? 2.0
        haptic         = try c.decodeIfPresent(Bool.self,     forKey: .haptic)         ?? true
        showStats      = try c.decodeIfPresent(Bool.self,     forKey: .showStats)      ?? true
        showGrid       = try c.decodeIfPresent(Bool.self,     forKey: .showGrid)       ?? false
        showCategory   = try c.decodeIfPresent(Bool.self,     forKey: .showCategory)   ?? true
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

    // Suppresses sendPrefUpdate while applying a payload from the phone
    // to prevent echo loops (phone → watch → phone → watch...).
    private var isSyncing = false

    // ── Watch-local persisted settings ──────────────────────────────────
    // Changes are saved to UserDefaults AND mirrored to iPhone when reachable.
    @Published var showGrid: Bool = false {
        didSet {
            UserDefaults.standard.set(showGrid, forKey: "wShowGrid")
            sendPrefUpdate("watchShowGrid", showGrid)
        }
    }
    @Published var showCategory: Bool = true {
        didSet {
            UserDefaults.standard.set(showCategory, forKey: "wShowCategory")
            sendPrefUpdate("watchShowCategory", showCategory)
        }
    }
    @Published var selectedCategory: String? = nil {
        didSet { UserDefaults.standard.set(selectedCategory, forKey: "wSelectedCat") }
    }
    @Published var dismissDelay: Double = 2.0 {
        didSet {
            UserDefaults.standard.set(dismissDelay, forKey: "wDismissDelay")
            sendPrefUpdate("watchDismiss", dismissDelay)
        }
    }
    @Published var haptic: Bool = true {
        didSet {
            UserDefaults.standard.set(haptic, forKey: "wHaptic")
            sendPrefUpdate("watchHaptic", haptic)
        }
    }
    @Published var showStats: Bool = true {
        didSet {
            UserDefaults.standard.set(showStats, forKey: "wShowStats")
            sendPrefUpdate("watchShowStats", showStats)
        }
    }

    override init() {
        super.init()
        let ud = UserDefaults.standard
        showGrid     = ud.bool(forKey: "wShowGrid")
        showCategory = ud.object(forKey: "wShowCategory") as? Bool   ?? true
        haptic       = ud.object(forKey: "wHaptic")       as? Bool   ?? true
        showStats    = ud.object(forKey: "wShowStats")    as? Bool   ?? true
        dismissDelay = ud.object(forKey: "wDismissDelay") as? Double ?? 2.0
        selectedCategory = ud.string(forKey: "wSelectedCat")

        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    private func sendPrefUpdate(_ key: String, _ value: Any) {
        guard !isSyncing,
              WCSession.default.activationState == .activated,
              WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["action": "updatePref", "key": key, "value": value],
            replyHandler: nil, errorHandler: nil
        )
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
        if haptic { WKInterfaceDevice.current().play(.click) }
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["action": "logHabit", "id": id],
            replyHandler: { [weak self] _ in self?.requestUpdate() },
            errorHandler: nil
        )
    }

    func resistHabit(_ id: String) {
        if haptic { WKInterfaceDevice.current().play(.success) }
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["action": "resistHabit", "id": id],
            replyHandler: { [weak self] _ in self?.requestUpdate() },
            errorHandler: nil
        )
    }

    func undoHabit(_ id: String) {
        if haptic { WKInterfaceDevice.current().play(.click) }
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
            DispatchQueue.main.async {
                // Suppress sendPrefUpdate in didSet while applying phone values
                self.isSyncing = true
                self.watchPrefs    = decoded
                self.showGrid      = decoded.showGrid
                self.showCategory  = decoded.showCategory
                self.dismissDelay  = decoded.dismissDelay
                self.haptic        = decoded.haptic
                self.showStats     = decoded.showStats
                self.isSyncing = false
                // Clear selected category if it no longer exists
                if let sel = self.selectedCategory, !decoded.categories.contains(sel) {
                    self.selectedCategory = nil
                }
            }
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
