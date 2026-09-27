import SwiftUI

/// Everything the Live Activity draws, independent of ActivityKit so the views can be
/// rendered anywhere (see .github/workflows/ios.yml, which renders them for review).
struct RestTimerModel {
    var workout: String
    var startedAt: Date
    var restStartedAt: Date?
    var restEndsAt: Date?
    var next: String
    var detail: String
    var done: Int
    var total: Int
    /// Set by the system once the rest's end time has passed, while the app is closed.
    var isStale: Bool

    /// The rest still running, as a range the system counts down by itself.
    var rest: ClosedRange<Date>? {
        guard !isStale, let start = restStartedAt, let end = restEndsAt, end > Date(), start < end else { return nil }
        return start...end
    }

    /// A rest was started and has run out, but the app hasn't cleared it yet.
    var restOver: Bool { restEndsAt != nil && rest == nil }
}

/// The app's indigo hero palette (src/index.css: --hero, --on-hero-muted, --hero-accent, --hero-ok).
enum Palette {
    static let hero = Color(red: 0x25 / 255, green: 0x21 / 255, blue: 0x6a / 255)
    static let heroTo = Color(red: 0x1b / 255, green: 0x18 / 255, blue: 0x46 / 255)
    static let muted = Color(red: 0xc9 / 255, green: 0xc6 / 255, blue: 0xf2 / 255)
    static let accent = Color(red: 0xc7 / 255, green: 0xc3 / 255, blue: 0xff / 255)
    static let ok = Color(red: 0x6e / 255, green: 0xe7 / 255, blue: 0xa0 / 255)
}

/// The rest countdown, ticking on its own: "1:23".
struct RestClock: View {
    let rest: ClosedRange<Date>
    var body: some View {
        Text(timerInterval: rest, countsDown: true, showsHours: false)
            .monospacedDigit()
    }
}

/// The lock-screen banner: a big rest countdown beside the set that's due next.
struct RestTimerLockScreen: View {
    let model: RestTimerModel

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "dumbbell.fill")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(Palette.accent)
                Text(model.workout)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Palette.muted)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text("\(model.done)/\(model.total) sets")
                    .font(.footnote.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(Palette.muted)
            }

            HStack(alignment: .center, spacing: 14) {
                if let rest = model.rest {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("REST")
                            .font(.caption2.weight(.bold))
                            .kerning(1)
                            .foregroundStyle(Palette.muted)
                        RestClock(rest: rest)
                            .font(.system(size: 46, weight: .bold).width(.condensed))
                            .foregroundStyle(.white)
                            .frame(minWidth: 92, alignment: .leading)
                    }
                } else if model.restOver {
                    Label("Go", systemImage: "checkmark.circle.fill")
                        .font(.system(size: 30, weight: .bold).width(.condensed))
                        .foregroundStyle(Palette.ok)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(model.rest != nil ? "UP NEXT" : model.restOver ? "REST OVER · UP NEXT" : "UP NEXT")
                        .font(.caption2.weight(.bold))
                        .kerning(1)
                        .foregroundStyle(model.restOver ? Palette.ok : Palette.muted)
                    Text(model.next)
                        .font(.headline)
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(model.detail)
                        .font(.subheadline)
                        .foregroundStyle(Palette.muted)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let rest = model.rest {
                ProgressView(timerInterval: rest, countsDown: true) {
                    EmptyView()
                } currentValueLabel: {
                    EmptyView()
                }
                .progressViewStyle(.linear)
                .tint(Palette.accent)
            }
        }
        .padding(16)
    }
}
