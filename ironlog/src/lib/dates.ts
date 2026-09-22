import { differenceInCalendarDays, format, formatDistanceToNowStrict, isToday, isYesterday, parseISO, startOfWeek } from 'date-fns'

export const WEEK_OPTS = { weekStartsOn: 1 as const }

export function weekStart(d: Date): Date {
  return startOfWeek(d, WEEK_OPTS)
}

export function dayKey(d: Date | string): string {
  return format(typeof d === 'string' ? parseISO(d) : d, 'yyyy-MM-dd')
}

export function friendlyDay(iso: string): string {
  const d = parseISO(iso)
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  const diff = differenceInCalendarDays(new Date(), d)
  if (diff > 0 && diff < 7) return format(d, 'EEEE')
  return format(d, d.getFullYear() === new Date().getFullYear() ? 'EEE d MMM' : 'd MMM yyyy')
}

export function relative(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true })
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m} min`
}

/** mm:ss or h:mm:ss for running clocks. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h ? m.toString().padStart(2, '0') : m.toString()
  return `${h ? `${h}:` : ''}${mm}:${sec.toString().padStart(2, '0')}`
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
