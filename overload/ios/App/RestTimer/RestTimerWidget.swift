import ActivityKit
import SwiftUI
import WidgetKit

@main
struct RestTimerBundle: WidgetBundle {
    var body: some Widget {
        RestTimerLiveActivity()
    }
}

extension RestTimerModel {
    init(_ context: ActivityViewContext<RestTimerAttributes>) {
        let s = context.state
        self.init(
            workout: context.attributes.workout, startedAt: context.attributes.startedAt,
            restStartedAt: s.restStartedAt, restEndsAt: s.restEndsAt,
            next: s.next, detail: s.detail, done: s.done, total: s.total,
            isStale: context.isStale)
    }
}

/// The workout on the lock screen and in the Dynamic Island. The app starts it, updates
/// it on every logged set and rest, and ends it with the workout; the countdown ticks and
/// flips to "Rest over" by itself while the app is closed.
struct RestTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RestTimerAttributes.self) { context in
            RestTimerLockScreen(model: RestTimerModel(context))
                .activityBackgroundTint(Palette.hero)
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let model = RestTimerModel(context)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label(model.rest != nil ? "Rest" : model.finished ? "Done" : model.restOver ? "Go" : "Up next",
                          systemImage: model.rest == nil && (model.finished || model.restOver) ? "checkmark.circle.fill" : "dumbbell.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(model.rest == nil && (model.finished || model.restOver) ? Palette.ok : Palette.accent)
                        .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let rest = model.rest {
                        RestClock(rest: rest)
                            .font(.system(size: 30, weight: .bold).width(.condensed))
                            .multilineTextAlignment(.trailing)
                            .frame(width: 72, alignment: .trailing)
                    } else {
                        Text("\(model.done)/\(model.total)")
                            .font(.title3.weight(.bold))
                            .monospacedDigit()
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(model.next).font(.headline).lineLimit(1)
                        Text(model.detail).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                        if let rest = model.rest {
                            ProgressView(timerInterval: rest, countsDown: true) {
                                EmptyView()
                            } currentValueLabel: {
                                EmptyView()
                            }
                            .tint(Palette.accent)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                Image(systemName: model.restOver ? "checkmark.circle.fill" : "dumbbell.fill")
                    .foregroundStyle(model.restOver ? Palette.ok : Palette.accent)
            } compactTrailing: {
                if let rest = model.rest {
                    RestClock(rest: rest)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 40)
                        .foregroundStyle(Palette.accent)
                } else {
                    Text(model.restOver ? "Go" : "\(model.done)/\(model.total)")
                        .monospacedDigit()
                        .foregroundStyle(model.restOver ? Palette.ok : Palette.accent)
                }
            } minimal: {
                if let rest = model.rest {
                    RestClock(rest: rest)
                        .font(.caption2.weight(.semibold))
                        .multilineTextAlignment(.center)
                        .foregroundStyle(Palette.accent)
                } else {
                    Image(systemName: model.restOver ? "checkmark.circle.fill" : "dumbbell.fill")
                        .foregroundStyle(model.restOver ? Palette.ok : Palette.accent)
                }
            }
            .keylineTint(Palette.accent)
        }
    }
}
