import Foundation
import WatchConnectivity
// RCTEventEmitter is available via the Expo-generated ObjC bridging header;
// no explicit `import React` needed (and it can cause issues with new arch).

// Singleton that owns the WCSession for the main iOS app.
// React Native calls sendHabits(_:) to push data to the watch.
// The watch can call back with logHabit messages, which are forwarded
// to RN via the "WatchLog" event.
@objc(SproutWatchBridge)
class SproutWatchBridge: RCTEventEmitter {

    private var hasListeners = false
    private var latestPayload: Data?

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    // ── RN export ──────────────────────────────────────────────────────────

    @objc static override func requiresMainQueueSetup() -> Bool { false }

    override func supportedEvents() -> [String]! {
        ["WatchLog", "WatchReachability"]
    }

    override func startObserving() { hasListeners = true }
    override func stopObserving()  { hasListeners = false }

    /// Called from JS with a JSON string of the current habits array.
    @objc func sendHabits(_ habitsJSON: String) {
        guard let data = habitsJSON.data(using: .utf8) else { return }
        latestPayload = data
        // Push via Application Context so the watch gets it even when not reachable.
        try? WCSession.default.updateApplicationContext(["habits": data])
        // Also send a direct message when reachable for instant update.
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(["habits": data], replyHandler: nil, errorHandler: nil)
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private func emit(_ name: String, body: Any) {
        guard hasListeners else { return }
        sendEvent(withName: name, body: body)
    }
}

// ── WCSessionDelegate ───────────────────────────────────────────────────────

extension SproutWatchBridge: WCSessionDelegate {

    func session(_ session: WCSession,
                 activationDidCompleteWith state: WCSessionActivationState,
                 error: Error?) {
        emit("WatchReachability", body: ["reachable": session.isReachable])
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        emit("WatchReachability", body: ["reachable": session.isReachable])
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }

    // Watch requested fresh habits
    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        if message["action"] as? String == "getHabits" {
            replyHandler(latestPayload.map { ["habits": $0] } ?? [:])

        } else if message["action"] as? String == "logHabit",
                  let id = message["id"] as? String {
            emit("WatchLog", body: ["id": id])
            replyHandler(["ok": true])

        } else {
            replyHandler([:])
        }
    }

    // Watch sent a fire-and-forget log
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        if let id = message["id"] as? String {
            emit("WatchLog", body: ["id": id])
        }
    }
}
