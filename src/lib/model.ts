import { z } from 'zod'

export const barcodeFormats = [
  'ean13',
  'ean8',
  'upca',
  'upce',
  'code128',
  'code39',
  'code93',
  'codabar',
  'itf',
  'qrcode',
  'aztec',
  'datamatrix',
  'pdf417',
] as const

export const cardThemes = [
  'sunset',
  'ocean',
  'forest',
  'grape',
  'midnight',
  'flamingo',
  'citrus',
  'graphite',
] as const

// Filesystem paths relative to Directory.Data — wallet.json never embeds image data
const cardPhotosSchema = z.object({
  front: z.string().optional(),
  back: z.string().optional(),
})

// scale ≥ 1 on top of cover-fit; x/y are offsets as fractions of the card frame size,
// so the same values render identically in every frame that keeps the card aspect
const cardCoverSchema = z.object({
  side: z.enum(['front', 'back']),
  scale: z.number().min(1).max(4),
  x: z.number(),
  y: z.number(),
})

const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
  format: z.enum(barcodeFormats),
  theme: z.enum(cardThemes),
  favorite: z.boolean(),
  addedAt: z.string(), // ISO date, sortable lexicographically
  folderId: z.string().nullable(),
  photos: cardPhotosSchema.default({}), // default keeps pre-photos wallets and backups valid
  cover: cardCoverSchema.optional(), // photo shown as the full card face in list/grid
  expiry: z.string().optional(), // ISO date, e.g. a voucher's "use by"
})

const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
})

// documents (IDs, licences) are photos-first: photos carry the content, everything else is optional
const docSchema = z.object({
  id: z.string(),
  name: z.string(),
  photos: cardPhotosSchema.default({}),
  cover: cardCoverSchema.optional(),
  number: z.string().optional(),
  expiry: z.string().optional(), // ISO date, e.g. licence "valid until"
  barcode: z.object({ value: z.string(), format: z.enum(barcodeFormats) }).optional(),
  addedAt: z.string(),
})

export const walletSchema = z.object({
  version: z.literal(1),
  cards: z.array(cardSchema),
  folders: z.array(folderSchema),
  documents: z.array(docSchema).default([]), // default keeps pre-documents wallets and backups valid
})

export type BarcodeFormat = (typeof barcodeFormats)[number]
export type CardTheme = (typeof cardThemes)[number]
export type CardPhotos = z.infer<typeof cardPhotosSchema>
export type PhotoSide = keyof CardPhotos
export type CardCover = z.infer<typeof cardCoverSchema>
export type Card = z.infer<typeof cardSchema>
export type Folder = z.infer<typeof folderSchema>
// "Doc" avoids clashing with the DOM's global Document type
export type Doc = z.infer<typeof docSchema>
export type Wallet = z.infer<typeof walletSchema>

export const emptyWallet: Wallet = { version: 1, cards: [], folders: [], documents: [] }

export const formatLabels: Record<BarcodeFormat, string> = {
  ean13: 'EAN-13',
  ean8: 'EAN-8',
  upca: 'UPC-A',
  upce: 'UPC-E',
  code128: 'CODE 128',
  code39: 'CODE 39',
  code93: 'CODE 93',
  codabar: 'Codabar',
  itf: 'ITF',
  qrcode: 'QR',
  aztec: 'Aztec',
  datamatrix: 'Data Matrix',
  pdf417: 'PDF417',
}

// square 2D symbologies get centered fixed-width rendering; the rest span full width
export const squareFormats: ReadonlySet<BarcodeFormat> = new Set(['qrcode', 'aztec', 'datamatrix'])

export const cardThemeGradients: Record<CardTheme, string> = {
  sunset: 'bg-gradient-to-br from-orange-400 via-rose-500 to-pink-600',
  ocean: 'bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700',
  forest: 'bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800',
  grape: 'bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-700',
  midnight: 'bg-gradient-to-br from-slate-700 via-slate-900 to-indigo-950',
  flamingo: 'bg-gradient-to-br from-rose-300 via-rose-500 to-red-500',
  citrus: 'bg-gradient-to-br from-amber-300 via-orange-500 to-red-600',
  graphite: 'bg-gradient-to-br from-neutral-600 via-neutral-800 to-neutral-950',
}

export const viewModes = ['deck', 'list', 'grid'] as const

export type ViewMode = (typeof viewModes)[number]
export type SortMode = 'manual' | 'az' | 'za' | 'newest' | 'oldest'
export type Appearance = 'light' | 'dark' | 'system'

export const sortComparators: Record<Exclude<SortMode, 'manual'>, (a: Card, b: Card) => number> = {
  az: (a, b) => a.name.localeCompare(b.name),
  za: (a, b) => b.name.localeCompare(a.name),
  newest: (a, b) => b.addedAt.localeCompare(a.addedAt),
  oldest: (a, b) => a.addedAt.localeCompare(b.addedAt),
}

export function sortCards(cards: Card[], mode: SortMode): Card[] {
  const sorted = mode === 'manual' ? [...cards] : [...cards].sort(sortComparators[mode])
  // favorites pin to top within any sort; Array.sort is stable so relative order survives
  return sorted.sort((a, b) => Number(b.favorite) - Number(a.favorite))
}

export function findDuplicateCard(cards: Card[], value: string, format: BarcodeFormat): Card | undefined {
  return cards.find(card => card.value === value && card.format === format)
}

export function formatAddedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function formatExpiry(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
