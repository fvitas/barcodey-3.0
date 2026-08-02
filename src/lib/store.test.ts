import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyWallet, type Card, type Wallet } from '@/lib/model'
import { cardStore } from '@/lib/store'

// in-memory stand-in for the Capacitor filesystem (single directory, path-keyed)
const files = new Map<string, string>()

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    readFile: vi.fn(({ path }: { path: string }) => {
      const data = files.get(path)
      if (data === undefined) return Promise.reject(new Error('File does not exist'))
      return Promise.resolve({ data })
    }),
    writeFile: vi.fn(({ path, data }: { path: string; data: string }) => {
      files.set(path, data)
      return Promise.resolve()
    }),
    deleteFile: vi.fn(({ path }: { path: string }) => {
      if (!files.delete(path)) return Promise.reject(new Error('File does not exist'))
      return Promise.resolve()
    }),
    rename: vi.fn(({ from, to }: { from: string; to: string }) => {
      const data = files.get(from)
      if (data === undefined) return Promise.reject(new Error('File does not exist'))
      files.delete(from)
      files.set(to, data)
      return Promise.resolve()
    }),
  },
}))

function makeWallet(name: string): Wallet {
  const card: Card = {
    id: crypto.randomUUID(),
    name,
    value: '123',
    format: 'code128',
    theme: 'ocean',
    favorite: false,
    addedAt: '2026-01-15',
    folderId: null,
    photos: {},
  }
  return { version: 1, cards: [card], folders: [], documents: [] }
}

beforeEach(() => {
  files.clear()
})

describe('cardStore', () => {
  it('round-trips a wallet through save and load', async () => {
    const wallet = makeWallet('Lidl Plus')
    await cardStore.save(wallet)
    expect(await cardStore.load()).toEqual(wallet)
  })

  it('loads the empty wallet when no file exists', async () => {
    expect(await cardStore.load()).toEqual(emptyWallet)
  })

  it('loads the empty wallet when the file is corrupt JSON', async () => {
    files.set('wallet.json', '{not json')
    expect(await cardStore.load()).toEqual(emptyWallet)
  })

  it('loads the empty wallet when the file fails schema validation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    files.set('wallet.json', JSON.stringify({ version: 99, cards: [], folders: [] }))
    expect(await cardStore.load()).toEqual(emptyWallet)
    vi.restoreAllMocks()
  })

  it('falls back to the tmp file after a crash mid-save', async () => {
    const wallet = makeWallet('Maxi')
    files.set('wallet.json.tmp', JSON.stringify(wallet))
    expect(await cardStore.load()).toEqual(wallet)
  })

  it('prefers the main file over a leftover tmp file', async () => {
    const older = makeWallet('Old')
    const newer = makeWallet('New')
    files.set('wallet.json', JSON.stringify(older))
    files.set('wallet.json.tmp', JSON.stringify(newer))
    expect(await cardStore.load()).toEqual(older)
  })

  it('leaves no tmp file behind after a save', async () => {
    await cardStore.save(makeWallet('Lidl Plus'))
    expect(files.has('wallet.json.tmp')).toBe(false)
    expect(files.has('wallet.json')).toBe(true)
  })

  it('overwrites a previous save', async () => {
    await cardStore.save(makeWallet('First'))
    const second = makeWallet('Second')
    await cardStore.save(second)
    expect(await cardStore.load()).toEqual(second)
  })

  it('serializes concurrent saves so the last one wins', async () => {
    const wallets = [makeWallet('One'), makeWallet('Two'), makeWallet('Three')]
    await Promise.all(wallets.map(wallet => cardStore.save(wallet)))
    expect(await cardStore.load()).toEqual(wallets[2])
  })
})
