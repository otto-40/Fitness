import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import { restoreNativeData } from './lib/nativeBoot'

// The store reads its saved data when it loads, so native storage is restored before the app is imported.
restoreNativeData().then(async () => {
  const [{ default: App }, { startNativeServices }] = await Promise.all([import('./App'), import('./lib/native')])
  startNativeServices()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  )
})
