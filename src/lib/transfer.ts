import { findDuplicateCard, walletSchema, type Card, type Doc, type Wallet } from '@/lib/model'

// frame text: BCY1:<transfer id>:<index>:<total>:<base64 chunk>
const framePrefix = 'BCY1'
// keeps each frame a mid-density QR — phone-to-phone scanning fails on version-30+ codes
const chunkLength = 450

export type TransferOptions = {
  includeDocuments: boolean
}

// photo paths are local to the sending device — they'd be dead references after transfer
function stripCard(card: Card): Card {
  const { cover: _cover, ...rest } = card
  return { ...rest, photos: {} }
}

function stripDoc(doc: Doc): Doc {
  const { cover: _cover, ...rest } = doc
  return { ...rest, photos: {} }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function deflate(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).text()
}

export async function encodeTransfer(wallet: Wallet, options: TransferOptions): Promise<string[]> {
  const payload: Wallet = {
    version: 1,
    cards: wallet.cards.map(stripCard),
    folders: wallet.folders,
    documents: options.includeDocuments ? wallet.documents.map(stripDoc) : [],
  }
  const encoded = bytesToBase64(await deflate(JSON.stringify(payload)))
  const total = Math.max(1, Math.ceil(encoded.length / chunkLength))
  const id = crypto.randomUUID().slice(0, 8)
  return Array.from(
    { length: total },
    (_, index) => `${framePrefix}:${id}:${index}:${total}:${encoded.slice(index * chunkLength, (index + 1) * chunkLength)}`,
  )
}

export type TransferCollector = {
  id: string | null
  total: number
  chunks: Map<number, string>
}

export function createCollector(): TransferCollector {
  return { id: null, total: 0, chunks: new Map() }
}

// true when the frame added a new chunk; a different transfer id restarts collection
export function collectFrame(collector: TransferCollector, text: string): boolean {
  const parts = text.split(':')
  if (parts.length !== 5 || parts[0] !== framePrefix) return false
  const [, id, indexText, totalText, chunk] = parts
  const index = Number(indexText)
  const total = Number(totalText)
  if (!Number.isInteger(index) || !Number.isInteger(total) || total < 1 || index < 0 || index >= total) return false
  if (chunk.length === 0) return false
  if (collector.id !== id || collector.total !== total) {
    collector.id = id
    collector.total = total
    collector.chunks.clear()
  }
  if (collector.chunks.has(index)) return false
  collector.chunks.set(index, chunk)
  return true
}

export function isTransferComplete(collector: TransferCollector): boolean {
  return collector.id !== null && collector.chunks.size === collector.total
}

export async function decodeTransfer(collector: TransferCollector): Promise<Wallet | null> {
  if (!isTransferComplete(collector)) return null
  const encoded = Array.from({ length: collector.total }, (_, index) => collector.chunks.get(index) ?? '').join('')
  try {
    const parsed = walletSchema.safeParse(JSON.parse(await inflate(base64ToBytes(encoded))))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export type MergeResult = {
  wallet: Wallet
  addedCards: number
  addedFolders: number
  addedDocuments: number
  skippedCards: number
  skippedDocuments: number
}

export function mergeWallet(current: Wallet, incoming: Wallet): MergeResult {
  const cards = [...current.cards]
  const folders = [...current.folders]
  const documents = [...current.documents]

  // incoming folder ids remap onto same-name (or same-id) folders that already exist here
  const folderIds = new Map<string, string>()
  let addedFolders = 0
  for (const folder of incoming.folders) {
    const existing = folders.find(other => other.id === folder.id || other.name === folder.name)
    if (existing !== undefined) {
      folderIds.set(folder.id, existing.id)
      continue
    }
    folders.push(folder)
    folderIds.set(folder.id, folder.id)
    addedFolders += 1
  }

  const cardIds = new Set(cards.map(card => card.id))
  let addedCards = 0
  let skippedCards = 0
  for (const card of incoming.cards) {
    if (findDuplicateCard(cards, card.value, card.format) !== undefined) {
      skippedCards += 1
      continue
    }
    const id = cardIds.has(card.id) ? crypto.randomUUID() : card.id
    cardIds.add(id)
    const folderId = card.folderId === null ? null : (folderIds.get(card.folderId) ?? null)
    cards.push({ ...stripCard(card), id, folderId })
    addedCards += 1
  }

  const docIds = new Set(documents.map(doc => doc.id))
  let addedDocuments = 0
  let skippedDocuments = 0
  for (const doc of incoming.documents) {
    if (documents.some(other => other.name === doc.name && other.number === doc.number)) {
      skippedDocuments += 1
      continue
    }
    const id = docIds.has(doc.id) ? crypto.randomUUID() : doc.id
    docIds.add(id)
    documents.push({ ...stripDoc(doc), id })
    addedDocuments += 1
  }

  return {
    wallet: { version: 1, cards, folders, documents },
    addedCards,
    addedFolders,
    addedDocuments,
    skippedCards,
    skippedDocuments,
  }
}
