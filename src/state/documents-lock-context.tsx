import { createContext, useContext, useEffect, useState } from 'react'
import { authenticateForDocuments, getLockMethod, type LockMethod } from '@/lib/biometric'
import { useUiState } from '@/state/ui-state-context'

type DocumentsLockValue = {
  method: LockMethod | null // null while detection is in flight
  unlocked: boolean
  unlock: () => Promise<boolean>
}

const DocumentsLockContext = createContext<DocumentsLockValue | null>(null)

export function DocumentsLockProvider({ children }: { children: React.ReactNode }) {
  const { state } = useUiState()
  const [method, setMethod] = useState<LockMethod | null>(null)
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    void getLockMethod().then(setMethod)
  }, [])

  // switching the lock on in settings locks immediately, not on next background
  useEffect(() => {
    if (state.lockDocuments) setPassed(false)
  }, [state.lockDocuments])

  // re-lock whenever the app leaves the foreground; fires in the native webview on background too
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) setPassed(false)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  async function unlock(): Promise<boolean> {
    const ok = await authenticateForDocuments()
    if (ok) setPassed(true)
    return ok
  }

  // a device with no biometry and no passcode has nothing to gate with
  const unlocked = method === 'none' || !state.lockDocuments || passed

  return (
    <DocumentsLockContext.Provider value={{ method, unlocked, unlock }}>{children}</DocumentsLockContext.Provider>
  )
}

export function useDocumentsLock(): DocumentsLockValue {
  const value = useContext(DocumentsLockContext)
  if (value === null) throw new Error('useDocumentsLock must be used inside DocumentsLockProvider')
  return value
}
