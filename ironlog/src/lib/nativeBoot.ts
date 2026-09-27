import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/** Where the app keeps its data (the name predates the rename to Overload). */
export const STORE_KEY = 'ironlog-v1'

/**
 * In the iPhone app, data is also kept in native storage, which iOS does not clear the
 * way it can clear a web view's local storage. Runs before the store loads: if local
 * storage came back empty, it is restored from the native copy.
 */
export async function restoreNativeData() {
  if (!Capacitor.isNativePlatform()) return
  try {
    if (localStorage.getItem(STORE_KEY)) return
    const { value } = await Preferences.get({ key: STORE_KEY })
    if (value) localStorage.setItem(STORE_KEY, value)
  } catch {
    /* start fresh */
  }
}
