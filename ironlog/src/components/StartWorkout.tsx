import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { ConfirmDialog } from './ui'

/** Starts a session, asking first if one is already running. */
export function useStartWorkout() {
  const navigate = useNavigate()
  const active = useStore((s) => s.active)
  const startWorkout = useStore((s) => s.startWorkout)
  const [pending, setPending] = useState<{ routineId: string | null } | null>(null)

  const go = (routineId: string | null) => {
    startWorkout(routineId)
    navigate('/workout')
  }

  const start = (routineId: string | null) => {
    if (active) setPending({ routineId })
    else go(routineId)
  }

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      onClose={() => setPending(null)}
      onConfirm={() => pending && go(pending.routineId)}
      title="Workout in progress"
      message={
        <>
          <strong className="text-ink">{active?.name}</strong> is still running. Starting a new workout will discard it and any sets you have logged.
        </>
      }
      confirmLabel="Discard and start"
    />
  )

  return { start, dialog, active }
}
