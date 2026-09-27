import { KeepAwake } from '@capacitor-community/keep-awake'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { Share } from '@capacitor/share'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { STORE_KEY } from './nativeBoot'
import { restAlert } from './restAlert'

/**
 * The iPhone app's native layer. Every export is safe to call on the web, where it
 * falls back to the browser equivalent or does nothing.
 */
export const isNative = Capacitor.isNativePlatform()

const REST_ALERT_ID = 1001

/** A short tap of feedback: logging a set, or the end of a rest. */
export function buzz(kind: 'log' | 'rest-over') {
  if (isNative) {
    if (kind === 'log') Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
    else Haptics.notification({ type: NotificationType.Success }).catch(() => {})
    return
  }
  navigator.vibrate?.(kind === 'log' ? 12 : [200, 100, 200])
}

/** Keeps the screen on during a workout. Returns false on the web, where the Wake Lock API is used instead. */
export function keepAwake(on: boolean): boolean {
  if (!isNative) return false
  ;(on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {})
  return true
}

/** Light text on dark themes, dark text on light ones. */
export function setStatusBar(dark: boolean) {
  if (isNative) StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {})
}

/** Saves a JSON file. The web downloads it; the iPhone app opens the share sheet (Files, AirDrop, Mail…). */
export async function saveJson(filename: string, obj: unknown): Promise<boolean> {
  if (!isNative) return false
  const { uri } = await Filesystem.writeFile({ path: filename, data: JSON.stringify(obj, null, 2), directory: Directory.Cache, encoding: Encoding.UTF8 })
  await Share.share({ title: filename, url: uri })
  return true
}

async function scheduleRestAlert() {
  const alert = restAlert(useStore.getState())
  if (!alert || alert.at < Date.now() + 1500) return
  const { display } = await LocalNotifications.checkPermissions()
  if (display !== 'granted') return
  await LocalNotifications.schedule({
    notifications: [{ id: REST_ALERT_ID, title: alert.title, body: alert.body, schedule: { at: new Date(alert.at), allowWhileIdle: true } }],
  })
}

async function clearRestAlert() {
  await LocalNotifications.cancel({ notifications: [{ id: REST_ALERT_ID }] })
  await LocalNotifications.removeAllDeliveredNotifications()
}

export type AlertPermission = 'granted' | 'denied' | 'prompt' | 'unsupported'

export async function requestRestAlerts(): Promise<AlertPermission> {
  if (!isNative) return 'unsupported'
  const { display } = await LocalNotifications.requestPermissions()
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'
}

/** Current permission for rest alerts, refreshed when the app returns to the foreground. */
export function useAlertPermission(): [AlertPermission, () => void] {
  const [state, setState] = useState<AlertPermission>(isNative ? 'prompt' : 'unsupported')
  useEffect(() => {
    if (!isNative) return
    const read = () =>
      LocalNotifications.checkPermissions()
        .then(({ display }) => setState(display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt'))
        .catch(() => {})
    read()
    const sub = CapApp.addListener('appStateChange', ({ isActive }) => isActive && read())
    return () => {
      sub.then((h) => h.remove())
    }
  }, [])
  return [state, () => requestRestAlerts().then(setState)]
}

/**
 * Starts the iPhone app's background services:
 * - rest alerts: when the app leaves the screen mid-rest, a notification is scheduled for the
 *   moment the rest ends, saying what is due next. Coming back cancels it; in the app the
 *   rest timer's own beep and haptic take over.
 * - the first rest of the first workout asks for notification permission, in context.
 * - every change to the data is copied to native storage (see nativeBoot.ts).
 */
export function startNativeServices() {
  if (!isNative) return
  let persist: ReturnType<typeof setTimeout> | undefined
  let asked = false
  useStore.subscribe((s, prev) => {
    clearTimeout(persist)
    persist = setTimeout(() => {
      const value = localStorage.getItem(STORE_KEY)
      if (value) Preferences.set({ key: STORE_KEY, value }).catch(() => {})
    }, 400)
    if (s.active?.rest && !prev.active?.rest && !asked) {
      asked = true
      LocalNotifications.checkPermissions()
        .then(({ display }) => (display === 'prompt' || display === 'prompt-with-rationale' ? LocalNotifications.requestPermissions() : null))
        .catch(() => {})
    }
  })
  CapApp.addListener('appStateChange', ({ isActive }) => {
    ;(isActive ? clearRestAlert() : scheduleRestAlert()).catch(() => {})
  })
}
