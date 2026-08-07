import { Capacitor } from '@capacitor/core'
import type { DesiredNotification, ExpiryKind } from '@/lib/expiry'

export const hasNotifications = Capacitor.isNativePlatform()

// dev-only: the first real reminder is 30 days out, so a simulator run would never see one
const devFireSeconds = import.meta.env.DEV && import.meta.env.VITE_EXPIRY_DEV_FIRE === '1'

export type NotificationTap = { kind: ExpiryKind; id: string }

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

export async function requestNotificationPermission(): Promise<boolean> {
  // web has nothing to ask and nothing to schedule, so the switch is free to turn on
  if (!hasNotifications) return true
  const LocalNotifications = await plugin()
  const { display } = await LocalNotifications.requestPermissions()
  return display === 'granted'
}

export async function notificationPermissionGranted(): Promise<boolean> {
  if (!hasNotifications) return true
  const LocalNotifications = await plugin()
  const { display } = await LocalNotifications.checkPermissions()
  return display === 'granted'
}

// full resync — cancel everything, schedule fresh — so a batch-local counter is enough for ids
export async function syncNotifications(desired: DesiredNotification[]): Promise<void> {
  if (!hasNotifications) return
  const LocalNotifications = await plugin()

  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length > 0) await LocalNotifications.cancel(pending)

  if (desired.length === 0) return
  if (!(await notificationPermissionGranted())) return

  await LocalNotifications.schedule({
    notifications: desired.map((entry, index) => ({
      id: index + 1,
      title: entry.title,
      body: entry.body,
      schedule: devFireSeconds
        ? { at: new Date(Date.now() + (index + 1) * 30_000) }
        : {
            on: {
              year: entry.at.getFullYear(),
              month: entry.at.getMonth() + 1, // ScheduleOn months are 1-based
              day: entry.at.getDate(),
              hour: entry.at.getHours(),
              minute: 0,
            },
          },
      extra: { kind: entry.kind, id: entry.itemId },
    })),
  })
}

export function onNotificationTap(handler: (tap: NotificationTap) => void): () => void {
  if (!hasNotifications) return () => {}
  let remove: (() => void) | null = null
  let cancelled = false

  void plugin().then(async LocalNotifications => {
    const listener = await LocalNotifications.addListener('localNotificationActionPerformed', event => {
      const extra: unknown = event.notification.extra
      if (typeof extra !== 'object' || extra === null) return
      const { kind, id } = extra as { kind?: unknown; id?: unknown }
      if ((kind !== 'card' && kind !== 'doc') || typeof id !== 'string') return
      handler({ kind, id })
    })
    if (cancelled) void listener.remove()
    else remove = () => void listener.remove()
  })

  return () => {
    cancelled = true
    remove?.()
  }
}
