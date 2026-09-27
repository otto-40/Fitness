import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { adoptEarlierData, STORE_KEY } from './storageKey'

/**
 * In the iPhone app, data is also kept in native storage, which iOS does not clear the
 * way it can clear a web view's local storage. Runs before the store loads: data saved
 * by an earlier version under another key is adopted first, then, if local storage is
 * still empty, it is restored from the native copy.
 */
export async function restoreNativeData() {
  adoptEarlierData()
  if (!Capacitor.isNativePlatform()) return
  try {
    if (localStorage.getItem(STORE_KEY)) return
    const { value } = await Preferences.get({ key: STORE_KEY })
    if (value) localStorage.setItem(STORE_KEY, value)
  } catch {
    /* start fresh */
  }
}
