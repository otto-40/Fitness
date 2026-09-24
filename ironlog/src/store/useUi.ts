import { useEffect } from 'react'
import { create } from 'zustand'

/** A request from the now panel to open a set's keypad inside its exercise card. */
export type PadRequest = { exId: string; setId: string; field: 'weight' | 'reps' | 'minutes' }

/** Transient UI state that is never persisted. */
export const useUi = create<{ focus: number; flash: string | null; padRequest: PadRequest | null }>(() => ({ focus: 0, flash: null, padRequest: null }))

/** Briefly flashes a set row green, from wherever the set was logged. */
export function flashSet(setId: string) {
  useUi.setState({ flash: setId })
  setTimeout(() => useUi.setState((s) => (s.flash === setId ? { flash: null } : s)), 700)
}

/** Hides the mobile tab bar while a full-screen editor with its own action bar is open. */
export function useFocusMode() {
  useEffect(() => {
    useUi.setState((s) => ({ focus: s.focus + 1 }))
    return () => useUi.setState((s) => ({ focus: s.focus - 1 }))
  }, [])
}
