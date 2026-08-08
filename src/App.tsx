import { MotionConfig } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { AddDrawer } from '@/components/AddDrawer'
import { AppNav } from '@/components/AppNav'
import { warmBarcodeRenderer } from '@/hooks/use-barcode-svg'
import { useExpiryReminders } from '@/hooks/use-expiry-reminders'
import type { Card } from '@/lib/model'
import { onNotificationTap, type NotificationTap } from '@/lib/notifications'
import { DocumentsScreen } from '@/screens/DocumentsScreen'
import { FolderScreen } from '@/screens/FolderScreen'
import { FoldersScreen } from '@/screens/FoldersScreen'
import { WalletScreen } from '@/screens/WalletScreen'
import { AddDrawerContext } from '@/state/add-drawer-context'
import { DocumentsLockProvider } from '@/state/documents-lock-context'
import { UiStateProvider, useUiState } from '@/state/ui-state-context'
import { WalletProvider, useWallet } from '@/state/wallet-context'

function AppShell() {
  const wallet = useWallet()
  const { ready, state, update } = useUiState()
  const [addOpen, setAddOpen] = useState(false)
  const [restored, setRestored] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const handleTap = useRef<(tap: NotificationTap) => void>(() => {})

  useExpiryReminders()

  // fetch the split bwip-js chunk right after first paint, before any pass expands
  useEffect(() => {
    void warmBarcodeRenderer()
  }, [])

  useEffect(() => {
    handleTap.current = tap => {
      if (tap.kind === 'card') {
        // a deleted card leaves nothing expanded, which is just the wall
        update({ expandedCardId: tap.id })
        navigate('/')
        return
      }
      // the documents screen applies the biometric gate itself when the lock is on
      navigate('/folders/documents')
    }
  })

  // the listener resolves after the continuity restore below, so a cold-start tap wins
  useEffect(() => onNotificationTap(tap => handleTap.current(tap)), [])

  // continuity: reopen where the app was left, once, from the default entry only
  useEffect(() => {
    if (!ready || restored) return
    if (location.pathname === '/' && state.path !== '/') {
      navigate(state.path, { replace: true })
    }
    setRestored(true)
  }, [ready, restored, state.path, location.pathname, navigate])

  useEffect(() => {
    if (!restored) return
    if (state.path !== location.pathname) {
      update({ path: location.pathname })
    }
  }, [restored, state.path, location.pathname, update])

  if (!wallet.ready || !ready) {
    return <div className="min-h-dvh" />
  }

  function handleAdd(card: Card) {
    wallet.addCard(card)
    // deck fronts the new card folded — the face is the confirmation; wall auto-expands
    update({ expandedCardId: state.view === 'deck' ? null : card.id })
    setAddOpen(false)
    navigate('/')
  }

  return (
    <AddDrawerContext.Provider value={() => setAddOpen(true)}>
      <Routes>
        <Route path="/" element={<WalletScreen />} />
        <Route path="/folders" element={<FoldersScreen />} />
        <Route path="/folders/documents" element={<DocumentsScreen />} />
        <Route path="/folders/:folderId" element={<FolderScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <AppNav onAdd={() => setAddOpen(true)} />
      <AddDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </AddDrawerContext.Provider>
  )
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <WalletProvider>
        <UiStateProvider>
          <DocumentsLockProvider>
            <BrowserRouter>
              <AppShell />
            </BrowserRouter>
          </DocumentsLockProvider>
        </UiStateProvider>
      </WalletProvider>
    </MotionConfig>
  )
}
