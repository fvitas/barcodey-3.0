import { describe, expect, it } from 'vitest'
import { emptyWallet, findDuplicateCard, sortCards, walletSchema, type Card, type Doc, type Wallet } from '@/lib/model'

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

function makeDoc(patch: Partial<Doc> = {}): Doc {
  return {
    id: crypto.randomUUID(),
    name: 'Driving licence',
    photos: {},
    addedAt: '2026-01-15',
    ...patch,
  }
}

describe('sortCards', () => {
  const lidl = makeCard({ name: 'Lidl', addedAt: '2026-03-01' })
  const aldi = makeCard({ name: 'Aldi', addedAt: '2026-01-10' })
  const maxi = makeCard({ name: 'Maxi', addedAt: '2026-02-20' })
  const cards = [lidl, aldi, maxi]

  it('sorts a to z by name', () => {
    expect(sortCards(cards, 'az').map(card => card.name)).toEqual(['Aldi', 'Lidl', 'Maxi'])
  })

  it('sorts z to a by name', () => {
    expect(sortCards(cards, 'za').map(card => card.name)).toEqual(['Maxi', 'Lidl', 'Aldi'])
  })

  it('sorts newest first by addedAt', () => {
    expect(sortCards(cards, 'newest').map(card => card.name)).toEqual(['Lidl', 'Maxi', 'Aldi'])
  })

  it('sorts oldest first by addedAt', () => {
    expect(sortCards(cards, 'oldest').map(card => card.name)).toEqual(['Aldi', 'Maxi', 'Lidl'])
  })

  it('keeps the given order in manual mode', () => {
    expect(sortCards(cards, 'manual').map(card => card.name)).toEqual(['Lidl', 'Aldi', 'Maxi'])
  })

  it('does not mutate the input array', () => {
    const input = [lidl, aldi, maxi]
    sortCards(input, 'az')
    expect(input.map(card => card.name)).toEqual(['Lidl', 'Aldi', 'Maxi'])
  })
})

describe('favorites pinning', () => {
  it('floats favorites to the top within a sort', () => {
    const cards = [
      makeCard({ name: 'Aldi' }),
      makeCard({ name: 'Zara', favorite: true }),
      makeCard({ name: 'Lidl' }),
      makeCard({ name: 'Maxi', favorite: true }),
    ]
    expect(sortCards(cards, 'az').map(card => card.name)).toEqual(['Maxi', 'Zara', 'Aldi', 'Lidl'])
  })

  it('keeps manual order within each partition', () => {
    const cards = [
      makeCard({ name: 'C' }),
      makeCard({ name: 'B', favorite: true }),
      makeCard({ name: 'A' }),
      makeCard({ name: 'D', favorite: true }),
    ]
    expect(sortCards(cards, 'manual').map(card => card.name)).toEqual(['B', 'D', 'C', 'A'])
  })
})

describe('findDuplicateCard', () => {
  const lidl = makeCard({ name: 'Lidl', value: '4006381333931', format: 'ean13' })
  const idea = makeCard({ name: 'IDEA', value: 'IDEA-77', format: 'qrcode' })
  const cards = [lidl, idea]

  it('finds a card matching value and format', () => {
    expect(findDuplicateCard(cards, '4006381333931', 'ean13')).toBe(lidl)
  })

  it('returns undefined when the value matches but the format differs', () => {
    expect(findDuplicateCard(cards, '4006381333931', 'code128')).toBeUndefined()
  })

  it('returns undefined when nothing matches', () => {
    expect(findDuplicateCard(cards, '000', 'ean13')).toBeUndefined()
    expect(findDuplicateCard([], '4006381333931', 'ean13')).toBeUndefined()
  })

  it('returns the first match when twins already exist', () => {
    const twin = makeCard({ name: 'Lidl twin', value: '4006381333931', format: 'ean13' })
    expect(findDuplicateCard([lidl, twin], '4006381333931', 'ean13')).toBe(lidl)
  })
})

describe('walletSchema (backup format)', () => {
  it('round-trips a wallet through JSON unchanged', () => {
    const wallet: Wallet = {
      version: 1,
      cards: [
        makeCard({ name: 'Lidl Plus', format: 'ean13', value: '4006381333931' }),
        makeCard({ name: 'Starbucks', format: 'qrcode', favorite: true, folderId: 'f1' }),
      ],
      folders: [{ id: 'f1', name: 'Coffee' }],
      documents: [],
    }
    const parsed = walletSchema.parse(JSON.parse(JSON.stringify(wallet)))
    expect(parsed).toEqual(wallet)
  })

  it('accepts an empty wallet', () => {
    expect(walletSchema.safeParse(emptyWallet).success).toBe(true)
  })

  it('defaults photos to empty on pre-photos backups', () => {
    const { photos: _photos, ...legacyCard } = makeCard()
    const wallet = { version: 1, cards: [legacyCard], folders: [] }
    const parsed = walletSchema.parse(wallet)
    expect(parsed.cards[0].photos).toEqual({})
  })

  it('keeps photo paths through a round-trip', () => {
    const card = makeCard({ photos: { front: 'photos/a.jpeg', back: 'photos/b.jpeg' } })
    const wallet: Wallet = { version: 1, cards: [card], folders: [], documents: [] }
    const parsed = walletSchema.parse(JSON.parse(JSON.stringify(wallet)))
    expect(parsed.cards[0].photos).toEqual({ front: 'photos/a.jpeg', back: 'photos/b.jpeg' })
  })

  it('defaults documents to empty on pre-documents backups', () => {
    const wallet = { version: 1, cards: [makeCard()], folders: [] }
    const parsed = walletSchema.parse(wallet)
    expect(parsed.documents).toEqual([])
  })

  it('round-trips a full document', () => {
    const doc = makeDoc({
      photos: { front: 'photos/a.jpeg', back: 'photos/b.jpeg' },
      cover: { side: 'front', scale: 1.5, x: 0.1, y: -0.05 },
      number: 'AB 123456',
      expiry: '2027-03-12',
      barcode: { value: 'ANSI 636000', format: 'pdf417' },
    })
    const wallet: Wallet = { version: 1, cards: [], folders: [], documents: [doc] }
    const parsed = walletSchema.parse(JSON.parse(JSON.stringify(wallet)))
    expect(parsed).toEqual(wallet)
  })

  it('accepts a bare document with only name and photos', () => {
    const wallet: Wallet = { version: 1, cards: [], folders: [], documents: [makeDoc()] }
    expect(walletSchema.safeParse(wallet).success).toBe(true)
  })

  it('rejects a document barcode with an unknown format', () => {
    const doc = { ...makeDoc(), barcode: { value: '1', format: 'code666' } }
    const wallet = { version: 1, cards: [], folders: [], documents: [doc] }
    expect(walletSchema.safeParse(wallet).success).toBe(false)
  })

  it('rejects an unknown version', () => {
    expect(walletSchema.safeParse({ ...emptyWallet, version: 2 }).success).toBe(false)
  })

  it('rejects an unknown barcode format', () => {
    const wallet = { version: 1, cards: [{ ...makeCard(), format: 'code666' }], folders: [] }
    expect(walletSchema.safeParse(wallet).success).toBe(false)
  })

  it('rejects an unknown theme', () => {
    const wallet = { version: 1, cards: [{ ...makeCard(), theme: 'lava' }], folders: [] }
    expect(walletSchema.safeParse(wallet).success).toBe(false)
  })

  it('rejects a card with missing fields', () => {
    const { favorite: _favorite, ...cardWithout } = makeCard()
    const wallet = { version: 1, cards: [cardWithout], folders: [] }
    expect(walletSchema.safeParse(wallet).success).toBe(false)
  })

  it('rejects non-object payloads', () => {
    expect(walletSchema.safeParse('not a wallet').success).toBe(false)
    expect(walletSchema.safeParse(null).success).toBe(false)
  })
})
