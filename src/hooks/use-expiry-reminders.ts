import { useEffect, useRef } from 'react'
import { desiredNotifications, expiryItems, remindersSignature, type ExpirySettings } from '@/lib/expiry'
import { syncNotifications } from '@/lib/notifications'
import { useUiState } from '@/state/ui-state-context'
import { useWallet } from '@/state/wallet-context'

export function useExpiryReminders(): void {
  const { ready, cards, documents } = useWallet()
  const { state } = useUiState()

  const items = expiryItems(cards, documents)
  const settings: ExpirySettings = { enabled: state.expiryReminders, lockDocuments: state.lockDocuments }
  const signature = remindersSignature(items, settings)

  const inputs = useRef({ items, settings })
  const lastSignature = useRef<string | null>(null)

  // no dep array: the handlers below re-plan from the freshest wallet without re-subscribing
  useEffect(() => {
    inputs.current = { items, settings }
  })

  function resync() {
    void syncNotifications(desiredNotifications(inputs.current.items, inputs.current.settings, new Date()))
  }

  useEffect(() => {
    if (!ready || lastSignature.current === signature) return
    lastSignature.current = signature
    resync()
  }, [ready, signature])

  // a day boundary crossed while backgrounded shifts every lead date, and the signature never moved
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden && ready) resync()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [ready])
}
