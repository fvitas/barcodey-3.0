export type BarcodeFormat = 'ean13' | 'code128' | 'qrcode'

export type CardTheme =
  | 'sunset'
  | 'ocean'
  | 'forest'
  | 'grape'
  | 'midnight'
  | 'flamingo'
  | 'citrus'
  | 'graphite'

export type LoyaltyCard = {
  id: string
  name: string
  value: string
  format: BarcodeFormat
  theme: CardTheme
  favorite: boolean
  addedAt: string // ISO date, sortable lexicographically
}

export function formatAddedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

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

export const cardThemeSolids: Record<CardTheme, string> = {
  sunset: 'bg-orange-500',
  ocean: 'bg-sky-500',
  forest: 'bg-emerald-500',
  grape: 'bg-violet-500',
  midnight: 'bg-slate-800',
  flamingo: 'bg-rose-400',
  citrus: 'bg-amber-400',
  graphite: 'bg-neutral-800',
}

export const mockCards: LoyaltyCard[] = [
  {
    id: 'lidl',
    name: 'Lidl Plus',
    value: '4006381333931',
    format: 'ean13',
    theme: 'ocean',
    favorite: true,
    addedAt: '2026-01-12',
  },
  {
    id: 'maxi',
    name: 'Maxi',
    value: 'MAXI-8412-0993',
    format: 'code128',
    theme: 'flamingo',
    favorite: false,
    addedAt: '2026-01-27',
  },
  {
    id: 'ikea',
    name: 'IKEA Family',
    value: '634158488282',
    format: 'code128',
    theme: 'midnight',
    favorite: true,
    addedAt: '2026-02-08',
  },
  {
    id: 'dm',
    name: 'dm active beauty',
    value: '5901234123457',
    format: 'ean13',
    theme: 'sunset',
    favorite: false,
    addedAt: '2026-02-19',
  },
  {
    id: 'decathlon',
    name: 'Decathlon',
    value: '2094857312',
    format: 'code128',
    theme: 'forest',
    favorite: false,
    addedAt: '2026-03-05',
  },
  {
    id: 'starbucks',
    name: 'Starbucks',
    value: 'BARCODEY-STAR-8842',
    format: 'qrcode',
    theme: 'graphite',
    favorite: false,
    addedAt: '2026-04-14',
  },
  {
    id: 'idea',
    name: 'IDEA',
    value: '9780201379624',
    format: 'ean13',
    theme: 'citrus',
    favorite: false,
    addedAt: '2026-05-22',
  },
  {
    id: 'tempo',
    name: 'Tempo',
    value: 'TMP-99-04412',
    format: 'code128',
    theme: 'grape',
    favorite: false,
    addedAt: '2026-06-30',
  },
]
