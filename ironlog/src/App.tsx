import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Toaster } from './components/ui'
import { useApplyTheme } from './hooks/useTheme'
import { useStore } from './store/useStore'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'

const Library = lazy(() => import('./pages/Library'))
const ExerciseDetail = lazy(() => import('./pages/ExerciseDetail'))
const Routines = lazy(() => import('./pages/Routines'))
const RoutineEditor = lazy(() => import('./pages/RoutineEditor'))
const LiveWorkout = lazy(() => import('./pages/LiveWorkout'))
const WorkoutSummary = lazy(() => import('./pages/WorkoutSummary'))
const History = lazy(() => import('./pages/History'))
const WorkoutDetail = lazy(() => import('./pages/WorkoutDetail'))
const Progress = lazy(() => import('./pages/Progress'))
const Body = lazy(() => import('./pages/Body'))
const Settings = lazy(() => import('./pages/Settings'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

export default function App() {
  useApplyTheme()
  const onboarded = useStore((s) => s.onboarded)

  if (!onboarded) {
    return (
      <>
        <Onboarding />
        <Toaster />
      </>
    )
  }

  return (
    <>
      <ScrollToTop />
      <AppShell>
        <Suspense fallback={<div className="h-40" aria-busy="true" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/library" element={<Library />} />
            <Route path="/library/:id" element={<ExerciseDetail />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/routines/:id" element={<RoutineEditor />} />
            <Route path="/workout" element={<LiveWorkout />} />
            <Route path="/workout/summary/:id" element={<WorkoutSummary />} />
            <Route path="/history" element={<History />} />
            <Route path="/history/:id" element={<WorkoutDetail />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/body" element={<Body />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Toaster />
    </>
  )
}
