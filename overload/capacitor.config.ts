import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The iPhone app wraps the same web build (dist/) that GitHub Pages serves.
 * The bundle ID must match the App ID registered with Apple; change it here
 * and in .github/workflows/ios.yml together, before the first upload.
 */
const config: CapacitorConfig = {
  appId: 'com.otto40.overload',
  appName: 'Overload',
  webDir: 'dist',
  // Safe areas are handled in CSS with env(safe-area-inset-*), so the web view spans the whole screen.
  ios: { contentInset: 'never', backgroundColor: '#eeede8', scheme: 'Overload' },
  plugins: {
    // Rest alerts are scheduled only while the app is in the background, so never show them over the app.
    LocalNotifications: { presentationOptions: [] },
  },
}

export default config
