import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { requestNotificationPermission } from '@/lib/notifications'
import { useUiState } from '@/state/ui-state-context'

// appears in the drawers only once a date is entered — reminders are opt-in, off by default
export function ExpiryReminderRow({ expiry }: { expiry: string | undefined }) {
  const { state, update } = useUiState()
  const [denied, setDenied] = useState(false)

  function handleToggle(checked: boolean) {
    if (!checked) return
    void requestNotificationPermission().then(granted => {
      setDenied(!granted)
      if (granted) update({ expiryReminders: true })
    })
  }

  if (expiry === undefined) return null

  if (state.expiryReminders) {
    return (
      <p className="mb-4 text-xs font-medium text-muted-foreground/80">
        You’ll be reminded 30, 7 and 1 day before.
      </p>
    )
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-semibold text-foreground">Remind me</p>
        <p className="mt-0.5 text-xs font-medium text-muted-foreground/80">
          {denied
            ? 'Allow notifications in Settings to get reminders'
            : 'A heads-up 30, 7 and 1 day before it expires'}
        </p>
      </div>
      <Switch checked={false} onCheckedChange={handleToggle} aria-label="Remind me" />
    </div>
  )
}
