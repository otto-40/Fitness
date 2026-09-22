import { useEffect } from 'react'
import { create } from 'zustand'

/** Transient UI state that is never persisted. */
export const useUi = create<{ focus: number }>(() => ({ focus: 0 }))

/** Hides the mobile tab bar while a full-screen editor with its own action bar is open. */
export function useFocusMode() {
  useEffect(() => {
    useUi.setState((s) => ({ focus: s.focus + 1 }))
    return () => useUi.setState((s) => ({ focus: s.focus - 1 }))
  }, [])
}
