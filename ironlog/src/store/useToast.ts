import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  tone: 'default' | 'success' | 'error'
  action?: { label: string; run: () => void }
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, opts?: Partial<Omit<Toast, 'id' | 'message'>>) => void
  dismiss: (id: number) => void
}

let next = 1

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, opts) => {
    const id = next++
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone: 'default', ...opts }] })
    setTimeout(() => get().dismiss(id), opts?.action ? 5000 : 3000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = (message: string, opts?: Partial<Omit<Toast, 'id' | 'message'>>) => useToast.getState().push(message, opts)
