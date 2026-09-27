/** Where the app keeps its data in local storage (and, in the iPhone app, native storage). */
export const STORE_KEY = 'overload-v1'

/** Minimal shape check: does this stored value look like this app's persisted state? */
function looksLikeAppState(raw: string | null): boolean {
  try {
    const v = JSON.parse(raw ?? '')
    const s = v?.state
    return typeof v?.version === 'number' && Array.isArray(s?.workouts) && Array.isArray(s?.routines) && typeof s?.settings === 'object'
  } catch {
    return false
  }
}

/**
 * Data saved by an earlier version of the app under a different key is adopted
 * under the current one, once, before the store loads. Other apps on the same
 * site keep their own keys and are never touched.
 */
export function adoptEarlierData(storage: Storage = localStorage) {
  try {
    if (storage.getItem(STORE_KEY)) return
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (!key || key === STORE_KEY || !/-v\d+$/.test(key)) continue
      const raw = storage.getItem(key)
      if (!looksLikeAppState(raw)) continue
      storage.setItem(STORE_KEY, raw!)
      storage.removeItem(key)
      return
    }
  } catch {
    /* storage unavailable: start fresh */
  }
}
