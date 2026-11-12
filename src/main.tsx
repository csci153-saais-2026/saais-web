import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { resolveSaaisEnvConfig } from '@/lib/supabase/client'

async function enableMockingIfConfigured(): Promise<void> {
  if (!import.meta.env.DEV) {
    return
  }
  const envConfig = resolveSaaisEnvConfig()
  const explicitExternalPrism = Boolean(
    import.meta.env.VITE_API_BASE_URL?.trim(),
  )
  if (envConfig.mode === 'mock' && !explicitExternalPrism) {
    const { startBrowserMockWorker } = await import('@/mocks/browser')
    await startBrowserMockWorker()
  }
}

void enableMockingIfConfigured().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
