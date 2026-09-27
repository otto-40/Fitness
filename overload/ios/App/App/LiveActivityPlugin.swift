import ActivityKit
import Capacitor
import Foundation

/// Starts, updates and ends the workout's Live Activity (RestTimerAttributes) for
/// src/lib/native.ts. Times arrive as epoch milliseconds.
@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
    ]

    /// The workout this app run last started an activity for. If that activity is gone,
    /// the user swiped it away, so it isn't brought back until the next workout.
    @MainActor private var startedFor: Date?

    private func date(_ ms: Double?) -> Date? {
        ms.map { Date(timeIntervalSince1970: $0 / 1000) }
    }

    @objc func status(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["enabled": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["enabled": false])
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        guard let workout = call.getString("workout"), let startedAt = date(call.getDouble("startedAt")) else {
            return call.reject("workout and startedAt are required")
        }
        let attributes = RestTimerAttributes(workout: workout, startedAt: startedAt)
        let state = RestTimerAttributes.ContentState(
            restStartedAt: date(call.getDouble("restStartedAt")),
            restEndsAt: date(call.getDouble("restEndsAt")),
            next: call.getString("next") ?? "",
            detail: call.getString("detail") ?? "",
            done: call.getInt("done") ?? 0,
            total: call.getInt("total") ?? 0)
        // Past the end of the rest the system redraws it as stale, which reads "Rest over".
        let content = ActivityContent(state: state, staleDate: state.restEndsAt)

        Task { @MainActor in
            let all = Activity<RestTimerAttributes>.activities
            for other in all where other.attributes.startedAt != startedAt {
                await other.end(nil, dismissalPolicy: .immediate)
            }
            let live = all.first {
                $0.attributes.startedAt == startedAt && $0.activityState != .ended && $0.activityState != .dismissed
            }
            if let live {
                await live.update(content)
            } else if startedFor != startedAt, ActivityAuthorizationInfo().areActivitiesEnabled {
                do {
                    _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
                    startedFor = startedAt
                } catch {
                    return call.reject("Couldn't start the Live Activity: \(error.localizedDescription)")
                }
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        Task { @MainActor in
            for activity in Activity<RestTimerAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            startedFor = nil
            call.resolve()
        }
    }
}
