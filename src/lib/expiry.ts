import { formatExpiry, type Card, type Doc } from '@/lib/model'

export const expiryLeadDays = [30, 7, 1] as const
export const pillWindowDays = 30
// iOS silently keeps only 64 pending notifications per app; 60 leaves headroom for 20 dated items
export const notificationCap = 60

const fireHour = 12 // noon local, deliberately inexact — a date reminder is not worth an exact-alarm permission

export type ExpiryKind = 'card' | 'doc'

export type ExpiryItem = {
  id: string
  kind: ExpiryKind
  name: string
  expiry: string
}

export type ExpirySettings = {
  enabled: boolean
  lockDocuments: boolean // document names stay out of the copy while the biometric gate is on
}

export type ExpiryBadge = {
  label: string
  tone: 'upcoming' | 'expired'
}

export type DesiredNotification = {
  itemId: string
  kind: ExpiryKind
  leadDays: number
  at: Date
  title: string
  body: string
}

// ISO dates are parsed component-wise: `new Date('2026-09-14')` is UTC midnight, which lands
// on the previous local day west of Greenwich and shifts every countdown by one
function localDate(isoDate: string, dayOffset: number, hour: number): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (match === null) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]) - dayOffset, hour)
  return Number.isNaN(date.getTime()) ? null : date
}

export function daysUntilExpiry(isoDate: string, now: Date): number | null {
  const target = localDate(isoDate, 0, 0)
  if (target === null) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // rounded, not floored: a DST boundary makes one of the days 23 or 25 hours long
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export function expiryBadge(isoDate: string | undefined, now: Date): ExpiryBadge | null {
  if (isoDate === undefined) return null
  const days = daysUntilExpiry(isoDate, now)
  if (days === null || days > pillWindowDays) return null
  if (days < 0) return { label: 'Expired', tone: 'expired' }
  if (days === 0) return { label: 'Today', tone: 'upcoming' }
  if (days === 1) return { label: 'Tomorrow', tone: 'upcoming' }
  return { label: `${days} days`, tone: 'upcoming' }
}

// long form belongs in the expanded pass; the pill has no room for it
export function expiryLongLabel(isoDate: string, now: Date): string {
  const days = daysUntilExpiry(isoDate, now)
  if (days === null || days >= 0) return `Expires ${formatExpiry(isoDate)}`
  const past = -days
  return past === 1 ? 'Expired yesterday' : `Expired ${past} days ago`
}

export function expiryItems(cards: Card[], documents: Doc[]): ExpiryItem[] {
  const fromCards: ExpiryItem[] = cards.flatMap(card =>
    card.expiry === undefined ? [] : [{ id: card.id, kind: 'card', name: card.name, expiry: card.expiry }],
  )
  const fromDocs: ExpiryItem[] = documents.flatMap(doc =>
    doc.expiry === undefined ? [] : [{ id: doc.id, kind: 'doc', name: doc.name, expiry: doc.expiry }],
  )
  return [...fromCards, ...fromDocs]
}

function leadPhrase(leadDays: number): string {
  return leadDays === 1 ? 'tomorrow' : `in ${leadDays} days`
}

function notificationBody(item: ExpiryItem, leadDays: number, settings: ExpirySettings): string {
  const named = item.kind === 'card' || !settings.lockDocuments
  const subject = named ? `${item.name} expires` : 'Your document expires'
  return `${subject} ${leadPhrase(leadDays)}`
}

export function desiredNotifications(
  items: ExpiryItem[],
  settings: ExpirySettings,
  now: Date,
): DesiredNotification[] {
  if (!settings.enabled) return []

  const dated = items
    .filter(item => localDate(item.expiry, 0, fireHour) !== null)
    .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.id.localeCompare(b.id))

  const scheduled: DesiredNotification[] = []
  for (const item of dated) {
    const forItem = expiryLeadDays.flatMap(leadDays => {
      const at = localDate(item.expiry, leadDays, fireHour)
      if (at === null || at.getTime() <= now.getTime()) return []
      return [
        {
          itemId: item.id,
          kind: item.kind,
          leadDays,
          at,
          title: 'Expiring soon',
          body: notificationBody(item, leadDays, settings),
        },
      ]
    })
    // items stay whole: dropping an item's 1-day reminder to fit its 30-day one loses the useful half
    if (scheduled.length + forItem.length > notificationCap) break
    scheduled.push(...forItem)
  }
  return scheduled
}

// cheap guard so unrelated saves (favourites, reorders, a card with no date) skip the resync;
// names are in the key because they are in the notification copy
export function remindersSignature(items: ExpiryItem[], settings: ExpirySettings): string {
  const keys = items.map(item => `${item.id}:${item.expiry}:${item.name}`).sort()
  return `${keys.join('|')}#${settings.enabled}#${settings.lockDocuments}`
}
