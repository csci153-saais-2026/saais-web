import { useEffect, useState } from 'react'

export function useScopedRequest<T>(key: string, enabled: boolean, load: () => Promise<T>, keepPrevious = false) {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: '' })
  useEffect(() => {
    let active = true
    if (enabled) void load().then(data => {
      if (active) setState({ key, data })
    }).catch((error: unknown) => {
      if (active) setState(previous => ({ key: keepPrevious && previous.data !== undefined ? previous.key : key, ...(keepPrevious ? { data: previous.data } : {}), error: error instanceof Error ? error.message : 'Unable to load records.' }))
    })
    return () => { active = false }
    // The key contains every input used by load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])
  return enabled && (state.key === key || (keepPrevious && state.data !== undefined)) ? state : { key }
}
