import { describe, expect, it } from 'vitest'
import type { Card, Doc, Folder, Wallet } from './model'
import {
  collectFrame,
  createCollector,
  decodeTransfer,
  encodeTransfer,
  isTransferComplete,
  mergeWallet,
} from './transfer'

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: crypto.randomUUID(),
    name: 'IDEA',
    value: '9780201379624',
    format: 'ean13',
    theme: 'sunset',
    favorite: false,
    addedAt: '2026-01-15T10:00:00.000Z',
    folderId: null,
    photos: {},
    ...overrides,
  }
}

function makeDoc(overrides: Partial<Doc> = {}): Doc {
  return {
    id: crypto.randomUUID(),
    name: 'Licence',
    photos: {},
    addedAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

function makeWallet(cards: Card[] = [], folders: Folder[] = [], documents: Doc[] = []): Wallet {
  return { version: 1, cards, folders, documents }
}

async function collectAll(frames: string[]): Promise<Wallet | null> {
  const collector = createCollector()
  for (const frame of frames) collectFrame(collector, frame)
  return decodeTransfer(collector)
}

describe('encodeTransfer / decodeTransfer', () => {
  it('round-trips a wallet through frames', async () => {
    const wallet = makeWallet(
      [makeCard(), makeCard({ name: 'Lidl', value: '4056489120000', format: 'ean13' })],
      [{ id: 'f1', name: 'Groceries' }],
    )
    const frames = await encodeTransfer(wallet, { includeDocuments: true })
    expect(await collectAll(frames)).toEqual(wallet)
  })

  it('splits a large wallet into multiple frames and survives shuffled, duplicated frames', async () => {
    const cards = Array.from({ length: 80 }, (_, index) =>
      makeCard({ name: `Card ${index}`, value: `CARD-${index}-${crypto.randomUUID()}`, format: 'code128' }),
    )
    const wallet = makeWallet(cards)
    const frames = await encodeTransfer(wallet, { includeDocuments: true })
    expect(frames.length).toBeGreaterThan(1)

    const noisy = [...frames, ...frames].reverse()
    expect(await collectAll(noisy)).toEqual(wallet)
  })

  it('strips photos and covers from cards and documents', async () => {
    const wallet = makeWallet(
      [makeCard({ photos: { front: 'photos/a.jpg' }, cover: { side: 'front', scale: 1.2, x: 0, y: 0 } })],
      [],
      [makeDoc({ photos: { front: 'photos/b.jpg', back: 'photos/c.jpg' }, cover: { side: 'back', scale: 1, x: 0, y: 0 } })],
    )
    const received = await collectAll(await encodeTransfer(wallet, { includeDocuments: true }))
    expect(received?.cards[0].photos).toEqual({})
    expect(received?.cards[0].cover).toBeUndefined()
    expect(received?.documents[0].photos).toEqual({})
    expect(received?.documents[0].cover).toBeUndefined()
  })

  it('excludes documents unless opted in', async () => {
    const wallet = makeWallet([makeCard()], [], [makeDoc()])
    const received = await collectAll(await encodeTransfer(wallet, { includeDocuments: false }))
    expect(received?.documents).toEqual([])
    expect(received?.cards).toHaveLength(1)
  })
})

describe('collectFrame', () => {
  it('rejects frames that are not transfer frames', () => {
    const collector = createCollector()
    expect(collectFrame(collector, '9780201379624')).toBe(false)
    expect(collectFrame(collector, 'BCY1:bad')).toBe(false)
    expect(collectFrame(collector, 'BCY1:id:2:2:abc')).toBe(false)
    expect(collectFrame(collector, 'BCY1:id:x:2:abc')).toBe(false)
    expect(collectFrame(collector, 'BCY1:id:0:2:')).toBe(false)
    expect(collector.chunks.size).toBe(0)
  })

  it('counts each chunk once', () => {
    const collector = createCollector()
    expect(collectFrame(collector, 'BCY1:id:0:2:abc')).toBe(true)
    expect(collectFrame(collector, 'BCY1:id:0:2:abc')).toBe(false)
    expect(collector.chunks.size).toBe(1)
    expect(isTransferComplete(collector)).toBe(false)
    expect(collectFrame(collector, 'BCY1:id:1:2:def')).toBe(true)
    expect(isTransferComplete(collector)).toBe(true)
  })

  it('restarts collection when a new transfer id appears', () => {
    const collector = createCollector()
    collectFrame(collector, 'BCY1:old:0:3:abc')
    collectFrame(collector, 'BCY1:old:1:3:def')
    collectFrame(collector, 'BCY1:new:0:2:ghi')
    expect(collector.id).toBe('new')
    expect(collector.chunks.size).toBe(1)
  })

  it('returns null from decode on garbage chunks', async () => {
    const collector = createCollector()
    collectFrame(collector, 'BCY1:id:0:1:!!!not-base64!!!')
    expect(await decodeTransfer(collector)).toBeNull()
  })
})

describe('mergeWallet', () => {
  it('adds new cards and skips value+format duplicates', () => {
    const mine = makeWallet([makeCard({ value: 'SHARED', format: 'code128' })])
    const theirs = makeWallet([
      makeCard({ name: 'Their copy', value: 'SHARED', format: 'code128' }),
      makeCard({ name: 'New card', value: 'FRESH', format: 'code128' }),
    ])
    const result = mergeWallet(mine, theirs)
    expect(result.addedCards).toBe(1)
    expect(result.skippedCards).toBe(1)
    expect(result.wallet.cards).toHaveLength(2)
  })

  it('remaps folder ids onto existing same-name folders', () => {
    const mine = makeWallet([], [{ id: 'mine-1', name: 'Groceries' }])
    const theirs = makeWallet(
      [makeCard({ value: 'A', folderId: 'theirs-1' }), makeCard({ value: 'B', folderId: 'theirs-2' })],
      [
        { id: 'theirs-1', name: 'Groceries' },
        { id: 'theirs-2', name: 'Travel' },
      ],
    )
    const result = mergeWallet(mine, theirs)
    expect(result.addedFolders).toBe(1)
    expect(result.wallet.folders).toHaveLength(2)
    expect(result.wallet.cards.find(card => card.value === 'A')?.folderId).toBe('mine-1')
    expect(result.wallet.cards.find(card => card.value === 'B')?.folderId).toBe('theirs-2')
  })

  it('nulls a folderId whose folder did not arrive', () => {
    const theirs = makeWallet([makeCard({ folderId: 'missing' })])
    const result = mergeWallet(makeWallet(), theirs)
    expect(result.wallet.cards[0].folderId).toBeNull()
  })

  it('regenerates a card id that already exists locally', () => {
    const shared = makeCard({ value: 'MINE' })
    const mine = makeWallet([shared])
    const theirs = makeWallet([makeCard({ id: shared.id, value: 'THEIRS' })])
    const result = mergeWallet(mine, theirs)
    const ids = result.wallet.cards.map(card => card.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('dedupes documents by name and number', () => {
    const mine = makeWallet([], [], [makeDoc({ name: 'Licence', number: '123' })])
    const theirs = makeWallet(
      [],
      [],
      [makeDoc({ name: 'Licence', number: '123' }), makeDoc({ name: 'Passport', number: '999' })],
    )
    const result = mergeWallet(mine, theirs)
    expect(result.addedDocuments).toBe(1)
    expect(result.skippedDocuments).toBe(1)
    expect(result.wallet.documents).toHaveLength(2)
  })

  it('merging into an empty wallet is a full copy', () => {
    const theirs = makeWallet([makeCard()], [{ id: 'f1', name: 'Groceries' }], [makeDoc()])
    const result = mergeWallet(makeWallet(), theirs)
    expect(result.wallet.cards).toHaveLength(1)
    expect(result.wallet.folders).toHaveLength(1)
    expect(result.wallet.documents).toHaveLength(1)
    expect(result.skippedCards).toBe(0)
  })
})
