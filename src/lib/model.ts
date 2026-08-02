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

const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
  format: z.enum(barcodeFormats),
  theme: z.enum(cardThemes),
  favorite: z.boolean(),
  addedAt: z.string(), // ISO date, sortable lexicographically
  folderId: z.string().nullable(),
})

const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const walletSchema = z.object({
  version: z.literal(1),
  cards: z.array(cardSchema),
  folders: z.array(folderSchema),
})

export type BarcodeFormat = (typeof barcodeFormats)[number]
export type CardTheme = (typeof cardThemes)[number]
export type Card = z.infer<typeof cardSchema>
export type Folder = z.infer<typeof folderSchema>
export type Wallet = z.infer<typeof walletSchema>

export const emptyWallet: Wallet = { version: 1, cards: [], folders: [] }

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

export type ViewMode = 'list' | 'grid'
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

export function formatAddedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
