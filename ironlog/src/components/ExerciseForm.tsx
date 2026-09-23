import { useState } from 'react'
import { uid } from '../lib/id'
import { useExerciseList } from '../hooks/useExercises'
import { useStore } from '../store/useStore'
import { toast } from '../store/useToast'
import type { Equipment, Exercise, Muscle } from '../types'
import { EQUIPMENT, MUSCLES } from '../types'
import { Button, Chip, Field, Input, Modal, Select, Stepper, Switch, Textarea } from './ui'

interface ExerciseFormProps {
  open: boolean
  onClose: () => void
  existing?: Exercise
  onSaved?: (id: string) => void
}

/** Mounted only while open, so every opening starts from the exercise's current values. */
export function ExerciseForm(props: ExerciseFormProps) {
  return props.open ? <OpenExerciseForm {...props} /> : null
}

function OpenExerciseForm({ open, onClose, existing, onSaved }: ExerciseFormProps) {
  const save = useStore((s) => s.saveExercise)
  const all = useExerciseList()
  const [name, setName] = useState(existing?.name ?? '')
  const [primary, setPrimary] = useState<Muscle>(existing?.primary ?? 'Chest')
  const [secondary, setSecondary] = useState<Muscle[]>(existing?.secondary ?? [])
  const [equipment, setEquipment] = useState<Equipment>(existing?.equipment ?? 'Barbell')
  const [cue, setCue] = useState(existing?.cue ?? '')
  const [aerobic, setAerobic] = useState(!!existing?.aerobic)
  const [minutes, setMinutes] = useState(existing?.defaultMinutes ?? 30)
  const [error, setError] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim().replace(/\s+/g, ' ')
    if (n.length < 2) return setError('Give the exercise a name (at least 2 characters).')
    if (n.length > 60) return setError('Keep the name under 60 characters.')
    if (all.some((x) => x.id !== existing?.id && x.name.toLowerCase() === n.toLowerCase()))
      return setError('An exercise with this name already exists.')
    const id = existing?.id ?? uid('cx')
    save({
      id,
      name: n,
      primary,
      secondary: secondary.filter((m) => m !== primary),
      equipment,
      cue: cue.trim(),
      custom: true,
      aerobic: aerobic || undefined,
      defaultMinutes: aerobic ? minutes : undefined,
    })
    toast(existing ? 'Exercise updated' : 'Custom exercise created', { tone: 'success' })
    onSaved?.(id)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit exercise' : 'New exercise'}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button block type="submit" form="exercise-form">
            Save
          </Button>
        </>
      }
    >
      <form id="exercise-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Name" error={error}>
          {(id, d) => (
            <Input
              id={id}
              data-autofocus
              aria-describedby={d}
              aria-invalid={!!error}
              value={name}
              maxLength={60}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="e.g. Meadows Row"
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary muscle">
            {(id) => (
              <Select id={id} value={primary} onChange={(e) => setPrimary(e.target.value as Muscle)}>
                {MUSCLES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Equipment">
            {(id) => (
              <Select id={id} value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
                {EQUIPMENT.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-2">Secondary muscles</legend>
          <div className="flex flex-wrap gap-2">
            {MUSCLES.filter((m) => m !== primary).map((m) => (
              <Chip key={m} active={secondary.includes(m)} onClick={() => setSecondary((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]))}>
                {m}
              </Chip>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-3 rounded-2xl bg-surface-2 p-3">
          <Switch
            checked={aerobic}
            onChange={setAerobic}
            label="Aerobic (log minutes)"
            description="Logged as minutes instead of weight and reps, and counted toward your weekly aerobic target."
          />
          {aerobic && <Stepper label="Default minutes" min={5} max={600} step={5} unit="min" value={minutes} onChange={setMinutes} className="bg-surface" />}
        </div>
        <Field label="Form cue" hint="One short reminder you want to see mid-set.">
          {(id, d) => <Textarea id={id} aria-describedby={d} value={cue} maxLength={200} onChange={(e) => setCue(e.target.value)} placeholder="e.g. Pull to the hip, pause at the top" />}
        </Field>
      </form>
    </Modal>
  )
}
