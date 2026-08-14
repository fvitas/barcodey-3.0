import { describe, expect, it } from 'vitest'
import { type Card } from '@/lib/model'
import { shortcutItems } from '@/lib/shortcuts'

function makeCard(patch: Partial<Card> = {}): Card {
  return {
    id: crypto.randomUUID(),
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

describe('shortcutItems', () => {
  const lidl = makeCard({ name: 'Lidl', addedAt: '2026-03-01' })
  const aldi = makeCard({ name: 'Aldi', addedAt: '2026-01-10' })
  const maxi = makeCard({ name: 'Maxi', addedAt: '2026-02-20', favorite: true })
  const spar = makeCard({ name: 'Spar', addedAt: '2026-02-01' })

  it('takes the top 3 in wall order', () => {
    expect(shortcutItems([lidl, aldi, maxi, spar], 'az').map(item => item.title)).toEqual(['Maxi', 'Aldi', 'Lidl'])
  })

  it('pins favorites first regardless of sort', () => {
    const items = shortcutItems([lidl, aldi, maxi, spar], 'newest')
    expect(items[0]).toEqual({ id: maxi.id, title: 'Maxi', favorite: true })
    expect(items.map(item => item.title)).toEqual(['Maxi', 'Lidl', 'Spar'])
  })

  it('keeps manual order behind favorites', () => {
    expect(shortcutItems([lidl, aldi, maxi, spar], 'manual').map(item => item.title)).toEqual([
      'Maxi',
      'Lidl',
      'Aldi',
    ])
  })

  it('returns fewer items when the wallet is small', () => {
    expect(shortcutItems([lidl], 'az')).toEqual([{ id: lidl.id, title: 'Lidl', favorite: false }])
  })

  it('returns nothing for an empty wallet', () => {
    expect(shortcutItems([], 'az')).toEqual([])
  })
})
