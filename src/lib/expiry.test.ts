import { describe, expect, it } from 'vitest'
import {
  daysUntilExpiry,
  desiredNotifications,
  expiryBadge,
  expiryItems,
  expiryLongLabel,
  notificationCap,
  remindersSignature,
  type ExpiryItem,
  type ExpirySettings,
} from '@/lib/expiry'
import type { Card, Doc } from '@/lib/model'

const now = new Date(2026, 7, 7, 9, 30) // 2026-08-07, local morning

const on: ExpirySettings = { enabled: true, lockDocuments: true }
const off: ExpirySettings = { enabled: false, lockDocuments: true }

function item(patch: Partial<ExpiryItem> = {}): ExpiryItem {
  return { id: 'a', kind: 'card', name: 'Starbucks gift card', expiry: '2026-09-06', ...patch }
}

function makeCard(patch: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    name: 'Card',
    value: '123',
    format: 'code128',
    theme: 'ocean',
    favorite: false,
    addedAt: '2026-01-15',
    folderId: null,
    photos: {},
    ...patch,
  }
}

function makeDoc(patch: Partial<Doc> = {}): Doc {
  return { id: 'doc-1', name: 'Driving licence', photos: {}, addedAt: '2026-01-15', ...patch }
}

describe('daysUntilExpiry', () => {
  it('counts whole local days, ignoring the time of day', () => {
    expect(daysUntilExpiry('2026-08-07', now)).toBe(0)
    expect(daysUntilExpiry('2026-08-08', now)).toBe(1)
    expect(daysUntilExpiry('2026-09-06', now)).toBe(30)
    expect(daysUntilExpiry('2026-08-04', now)).toBe(-3)
  })

  it('rejects anything that is not an ISO date', () => {
    expect(daysUntilExpiry('', now)).toBeNull()
    expect(daysUntilExpiry('06/09/2026', now)).toBeNull()
  })
})

describe('expiryBadge', () => {
  it('appears only inside the 30 day window', () => {
    expect(expiryBadge('2026-09-07', now)).toBeNull() // 31 days
    expect(expiryBadge('2026-09-06', now)).toEqual({ label: '30 days', tone: 'upcoming' })
    expect(expiryBadge(undefined, now)).toBeNull()
  })

  it('wears one neutral tone for the whole countdown', () => {
    expect(expiryBadge('2026-08-10', now)).toEqual({ label: '3 days', tone: 'upcoming' })
    expect(expiryBadge('2026-08-08', now)).toEqual({ label: 'Tomorrow', tone: 'upcoming' })
    expect(expiryBadge('2026-08-07', now)).toEqual({ label: 'Today', tone: 'upcoming' })
  })

  it('stays visible indefinitely once past', () => {
    expect(expiryBadge('2026-08-06', now)).toEqual({ label: 'Expired', tone: 'expired' })
    expect(expiryBadge('2019-01-01', now)).toEqual({ label: 'Expired', tone: 'expired' })
  })
})

describe('expiryLongLabel', () => {
  it('carries the long wording the pill has no room for', () => {
    expect(expiryLongLabel('2026-09-14', now)).toBe('Expires Sep 14, 2026')
    expect(expiryLongLabel('2026-08-06', now)).toBe('Expired yesterday')
    expect(expiryLongLabel('2026-08-04', now)).toBe('Expired 3 days ago')
  })
})

describe('expiryItems', () => {
  it('keeps only dated cards and documents, cards first', () => {
    const items = expiryItems(
      [makeCard({ id: 'c1', expiry: '2026-09-01' }), makeCard({ id: 'c2' })],
      [makeDoc({ id: 'd1', expiry: '2026-10-01' }), makeDoc({ id: 'd2' })],
    )
    expect(items).toEqual([
      { id: 'c1', kind: 'card', name: 'Card', expiry: '2026-09-01' },
      { id: 'd1', kind: 'doc', name: 'Driving licence', expiry: '2026-10-01' },
    ])
  })
})

describe('desiredNotifications', () => {
  it('schedules 30, 7 and 1 day ahead at noon local', () => {
    const plan = desiredNotifications([item({ expiry: '2026-10-01' })], on, now)
    expect(plan.map(entry => entry.leadDays)).toEqual([30, 7, 1])
    expect(plan.map(entry => entry.at.toString())).toEqual([
      new Date(2026, 8, 1, 12).toString(),
      new Date(2026, 8, 24, 12).toString(),
      new Date(2026, 8, 30, 12).toString(),
    ])
  })

  it('schedules nothing while reminders are off', () => {
    expect(desiredNotifications([item({ expiry: '2026-10-01' })], off, now)).toEqual([])
  })

  it('skips lead days that have already gone by', () => {
    // 30 and 7 days out are both in the past for a date 3 days away
    const plan = desiredNotifications([item({ expiry: '2026-08-10' })], on, now)
    expect(plan.map(entry => entry.leadDays)).toEqual([1])
  })

  it('skips an expired item entirely', () => {
    expect(desiredNotifications([item({ expiry: '2026-08-04' })], on, now)).toEqual([])
  })

  it('skips today, whose noon may already have passed', () => {
    const afternoon = new Date(2026, 7, 7, 15)
    expect(desiredNotifications([item({ expiry: '2026-08-08' })], on, afternoon)).toEqual([])
  })

  it('names cards and, with the biometric gate on, never names documents', () => {
    const [card] = desiredNotifications([item({ expiry: '2026-08-14' })], on, now)
    expect(card.body).toBe('Starbucks gift card expires in 7 days')

    const [gated] = desiredNotifications([item({ kind: 'doc', name: 'Passport', expiry: '2026-08-14' })], on, now)
    expect(gated.body).toBe('Your document expires in 7 days')

    const [ungated] = desiredNotifications(
      [item({ kind: 'doc', name: 'Passport', expiry: '2026-08-14' })],
      { enabled: true, lockDocuments: false },
      now,
    )
    expect(ungated.body).toBe('Passport expires in 7 days')
  })

  it('says tomorrow rather than in 1 days', () => {
    const [tomorrow] = desiredNotifications([item({ expiry: '2026-08-08' })], on, now)
    expect(tomorrow.body).toBe('Starbucks gift card expires tomorrow')
  })

  it('caps at 60, keeping the soonest expiries whole', () => {
    // 25 dated items × 3 leads = 75 wanted; only the 20 soonest fit
    const items = Array.from({ length: 25 }, (_, index) =>
      item({ id: `card-${index}`, expiry: `2026-10-${String(index + 1).padStart(2, '0')}` }),
    )
    const plan = desiredNotifications(items, on, now)
    expect(plan).toHaveLength(notificationCap)
    const ids = new Set(plan.map(entry => entry.itemId))
    expect(ids.size).toBe(20)
    expect(ids.has('card-0')).toBe(true)
    expect(ids.has('card-20')).toBe(false)
  })

  it('carries the item id and kind for the tap deep link', () => {
    const [first] = desiredNotifications([item({ id: 'abc', kind: 'doc', expiry: '2026-10-01' })], on, now)
    expect(first.itemId).toBe('abc')
    expect(first.kind).toBe('doc')
  })
})

describe('remindersSignature', () => {
  const items = [item({ id: 'a', expiry: '2026-10-01' }), item({ id: 'b', expiry: '2026-11-01' })]

  it('ignores the order the items arrive in', () => {
    expect(remindersSignature([...items].reverse(), on)).toBe(remindersSignature(items, on))
  })

  it('changes when a date, a name, or a setting changes', () => {
    const base = remindersSignature(items, on)
    expect(remindersSignature([items[0], item({ id: 'b', expiry: '2026-11-02' })], on)).not.toBe(base)
    expect(remindersSignature([items[0], item({ id: 'b', name: 'Renamed', expiry: '2026-11-01' })], on)).not.toBe(base)
    expect(remindersSignature(items, off)).not.toBe(base)
    expect(remindersSignature(items, { enabled: true, lockDocuments: false })).not.toBe(base)
  })
})
