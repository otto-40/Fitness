// Renders the lock-screen Live Activity (App/RestTimer/RestTimerViews.swift) to PNGs on a Mac,
// so its design can be checked without an iPhone. CI runs it and uploads the images:
//   swiftc -parse-as-library -o render ios/App/RestTimer/RestTimerViews.swift ios/tools/render-live-activity.swift
//   ./render out/
// ImageRenderer can't draw the timer-driven progress bar on a Mac and shows a yellow placeholder
// in its place; the iPhone draws it as a draining orange bar.
import AppKit
import SwiftUI

@main
struct RenderLiveActivity {
    @MainActor static func main() {
        let out = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? ".")
        try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
        let now = Date()
        let base = RestTimerModel(
            workout: "Monday · Legs", startedAt: now.addingTimeInterval(-1500),
            restStartedAt: nil, restEndsAt: nil,
            next: "Leg Press", detail: "Set 2 of 4 · 180 kg × 11 reps", done: 5, total: 16, isStale: false)
        var resting = base
        resting.restStartedAt = now.addingTimeInterval(-40)
        resting.restEndsAt = now.addingTimeInterval(80)
        var over = resting
        over.isStale = true
        var finished = base
        (finished.next, finished.detail, finished.done) = ("All sets logged", "Finish the workout when you’re ready", 16)

        for (name, model) in [("resting", resting), ("rest-over", over), ("up-next", base), ("all-done", finished)] {
            let view = RestTimerLockScreen(model: model)
                .frame(width: 370)
                .background(Palette.hero, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                .padding(12)
                .background(Color(white: 0.12))
            let renderer = ImageRenderer(content: view)
            renderer.scale = 3
            guard let image = renderer.cgImage,
                  let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else {
                fatalError("Couldn't render \(name)")
            }
            try! png.write(to: out.appendingPathComponent("\(name).png"))
            print("Rendered \(name).png (\(image.width)×\(image.height))")
        }
    }
}
