# Publishing Overload on the App Store (no Mac needed)

The iPhone app is the same web app wrapped with [Capacitor](https://capacitorjs.com), plus native rest alerts, a lock-screen and Dynamic Island rest countdown (a Live Activity), haptics, keep-awake and a share-sheet export. GitHub builds it on Apple's macOS machines (the `iOS app` workflow), so every step below works from a PC or phone browser.

- **What I (Claude) set up:** everything in the repo.
- **What only you can do:** the Apple account steps, because they need your identity and payment.

## One-time setup (about an hour, plus Apple's 1–2 day verification)

1. **Join the Apple Developer Program** ($99 a year) at [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll).
   - Enrol as an *Individual*: the store will show your name as the seller.
   - The Apple Developer app on your iPhone can do the enrolment and identity check.

2. **Find your Team ID.** It's in [developer.apple.com/account](https://developer.apple.com/account) → Membership details: a 10-character code such as `A1B2C3D4E5`.

3. **Register the app's ID.** Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) → Identifiers → **+** → App IDs → App.
   - Description: `Overload`.
   - Bundle ID: *Explicit*, `com.otto40.overload`.
   - No extra capabilities are needed: rest alerts are local notifications, not push.
   - Then register a second ID the same way for the lock-screen timer, which is an app extension: Description `Overload Rest Timer`, Bundle ID *Explicit*, `com.otto40.overload.RestTimer`, no capabilities.
   - Want a different bundle ID? Tell me before the first upload. It is set in `capacitor.config.ts` and the Xcode project (the timer's ID is always the app's plus `.RestTimer`), and can't change after release.

4. **Create the app in App Store Connect.** Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Apps → **+** → New App.
   - Platform: iOS.
   - Name: see `app-store/listing.md`. Names are unique store-wide, so have a fallback ready.
   - Primary language, the bundle ID from step 3, and SKU `overload-ios`.

5. **Create an API key for GitHub.** In App Store Connect go to Users and Access → Integrations → App Store Connect API → Team Keys → **+**.
   - Name it `GitHub Actions` and give it **Admin** access. Admin is needed so the build can create its own signing certificate in the cloud.
   - Download the `.p8` file. It can be downloaded only once.
   - Note the **Key ID** and the **Issuer ID** shown at the top of that page.

6. **Add four secrets to GitHub.** In [the repo](https://github.com/otto-40/Fitness) go to Settings → Secrets and variables → Actions → New repository secret:

   | Secret | Value |
   | --- | --- |
   | `APPLE_TEAM_ID` | Team ID from step 2 |
   | `ASC_KEY_ID` | Key ID from step 5 |
   | `ASC_ISSUER_ID` | Issuer ID from step 5 |
   | `ASC_KEY_P8` | The whole contents of the `.p8` file, including the BEGIN and END lines |

## Each release

1. **Start the build.** In GitHub go to Actions → **iOS app** → **Run workflow**, enter the version (e.g. `1.0.0`), and press Run.
   - It takes about 15 minutes.
   - It builds the app unsigned, then Apple's cloud signing signs it with your API key and uploads it. No certificates, keychains or registered devices are needed. The build number is set automatically.
2. **Wait for processing.** The build appears in App Store Connect → your app → **TestFlight** after 10–30 minutes of processing.
3. **Try it on your iPhone first.**
   - Install **TestFlight** from the App Store.
   - In App Store Connect → TestFlight → Internal Testing, add yourself.
   - Install Overload from TestFlight and check rest alerts: log a set and lock the phone. The lock screen counts down the rest and shows the next set, and a notification arrives when rest is over.
4. **Bring your data across.**
   - In the web app, open Settings → Export JSON and save the file to Files.
   - In the iPhone app, open Settings → Import JSON and pick it.
   - The iPhone app can't read the web version's storage directly.
5. **Submit for review.** In App Store Connect → your app → the version under *iOS App*:
   - Upload the screenshots from `app-store/screenshots/`.
   - Paste the text from `app-store/listing.md`.
   - Set the privacy policy URL.
   - Answer App Privacy with **Data Not Collected**.
   - Complete the age rating (4+).
   - Pick the build, then **Add for Review → Submit**.
   - Review usually takes 1–3 days.
6. **Updates:** run the workflow again with a higher version (e.g. `1.0.1`) and submit that build.

## Checks on every change

Every push or pull request that touches `overload/` also runs an unsigned simulator build on `macos-26` (Xcode 26, which Apple requires for uploads since April 2026). A broken iOS build shows up before any release. The same run draws the lock-screen timer in four states (resting, rest over, up next, all done) and attaches the images to the run as `live-activity-previews`.

## If something goes wrong

- **"Missing secrets"**: one of the four secrets in step 6 is empty or misnamed.
- **Signing or certificate errors in "Sign and upload"**: the API key needs **Admin** access (step 5). A key with a lower role can't create the cloud distribution certificate.
- **"No suitable application records were found"**: the App Store Connect app (step 4) doesn't exist yet, or its bundle ID differs from `com.otto40.overload`.
- **Rejected under Guideline 4.2 (minimum functionality)**: Apple sometimes rejects wrapped websites. Reply in App Store Connect and point to the native features: lock-screen rest alerts, the lock-screen and Dynamic Island rest countdown (a Live Activity), haptics, share-sheet export, and working fully offline.

## Working on the iOS project locally

- `npm run ios:sync` builds the web app and copies it into `ios/App/App/public`.
- The Xcode project is `ios/App/App.xcodeproj`, and it uses Swift Package Manager, so there's no CocoaPods.
- The lock-screen timer is the `RestTimer` widget extension (`ios/App/RestTimer/`). The app starts and updates it through `LiveActivityPlugin.swift`, registered in `MainViewController.swift`; `Shared/RestTimerAttributes.swift` is compiled into both.
- Opening the project needs a Mac. Nothing in the normal workflow does.
