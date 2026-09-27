import ActivityKit
import Foundation

/// The workout in progress, as shown on the lock screen and in the Dynamic Island.
/// Compiled into the app, which starts and updates it (LiveActivityPlugin), and into the
/// RestTimer widget extension, which draws it.
@available(iOS 16.1, *)
struct RestTimerAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        /// Both nil when not resting.
        var restStartedAt: Date?
        var restEndsAt: Date?
        /// "Leg Press", or "All sets logged".
        var next: String
        /// "Set 2 of 4 · 180 kg × 11 reps".
        var detail: String
        var done: Int
        var total: Int
    }

    var workout: String
    var startedAt: Date
}
