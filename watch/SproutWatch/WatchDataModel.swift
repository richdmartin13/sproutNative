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

class WatchDataModel: NSObject, ObservableObject {
    @Published var habits: [WatchHabit] = []
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
        // Apply any cached context immediately
        applyContext(WCSession.default.receivedApplicationContext)
        // Then request a fresh snapshot from the phone
        guard WCSession.default.isReachable else {
            DispatchQueue.main.async { self.isLoading = false }
            return
        }
        WCSession.default.sendMessage(["action": "getHabits"], replyHandler: { reply in
            self.handleHabitsPayload(reply)
        }, errorHandler: { _ in
            DispatchQueue.main.async { self.isLoading = false }
        })
    }

    func logHabit(_ id: String) {
        WKInterfaceDevice.current().play(.click)
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["action": "logHabit", "id": id],
            replyHandler: { [weak self] _ in self?.requestUpdate() },
            errorHandler: nil
        )
    }

    func undoHabit(_ id: String) {
        WKInterfaceDevice.current().play(.click)
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["action": "undoHabit", "id": id],
            replyHandler: { [weak self] _ in self?.requestUpdate() },
            errorHandler: nil
        )
    }

    private func handleHabitsPayload(_ payload: [String: Any]) {
        guard let data = payload["habits"] as? Data,
              let decoded = try? JSONDecoder().decode([WatchHabit].self, from: data) else { return }
        DispatchQueue.main.async {
            self.habits = decoded
            self.isLoading = false
        }
    }

    private func applyContext(_ ctx: [String: Any]) {
        guard !ctx.isEmpty else { return }
        handleHabitsPayload(ctx)
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
        handleHabitsPayload(message)
    }
}
