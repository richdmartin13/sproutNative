import Foundation
import WatchConnectivity
import WatchKit

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
    var dismissDelay: Double = 2.0
    var haptic: Bool = true
    var showStats: Bool = true
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
