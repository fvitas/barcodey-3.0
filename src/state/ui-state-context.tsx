import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { defaultUiState, loadUiState, saveUiState, type UiState } from '@/lib/ui-state'

type UiStateContextValue = {
  ready: boolean
  state: UiState
  update: (patch: Partial<UiState>) => void
}

const UiStateContext = createContext<UiStateContextValue | null>(null)

export function UiStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(defaultUiState)
  const [ready, setReady] = useState(false)
  const loadStarted = useRef(false)

  useEffect(() => {
    if (loadStarted.current) return
    loadStarted.current = true
    void loadUiState().then(loaded => {
      setState(loaded)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    void saveUiState(state)
  }, [ready, state])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const dark = state.appearance === 'dark' || (state.appearance === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [state.appearance])

  function update(patch: Partial<UiState>) {
    setState(current => ({ ...current, ...patch }))
  }

  return <UiStateContext.Provider value={{ ready, state, update }}>{children}</UiStateContext.Provider>
}

export function useUiState(): UiStateContextValue {
  const value = useContext(UiStateContext)
  if (value === null) throw new Error('useUiState must be used inside UiStateProvider')
  return value
}
