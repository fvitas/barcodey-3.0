import { cardThemeGradients, type Card } from '@/lib/model'

// gray or unreadable photos fall back here instead of producing mud
export const fallbackCardColor = '#475569'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// h in degrees, s/l in 0..1
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return [h, s, l]
}

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return rgbToHsl(r, g, b)
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const sector = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((sector % 2) - 1))
  const [r, g, b] =
    sector < 1 ? [c, x, 0]
    : sector < 2 ? [x, c, 0]
    : sector < 3 ? [0, c, x]
    : sector < 4 ? [0, x, c]
    : sector < 5 ? [x, 0, c]
    : [c, 0, x]
  const m = l - c / 2
  const channel = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

// vibrance-weighted dominant color: saturated logo pixels outweigh the white/gray
// plastic around them, and mid-lightness buckets beat glare and shadows
export function extractCardColor(image: { data: Uint8ClampedArray }): string {
  const { data } = image
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 128) continue
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key)
    if (bucket === undefined) buckets.set(key, { count: 1, r, g, b })
    else {
      bucket.count += 1
      bucket.r += r
      bucket.g += g
      bucket.b += b
    }
  }

  let best: [number, number, number] | null = null
  let bestScore = 0
  for (const { count, r, g, b } of buckets.values()) {
    const [h, s, l] = rgbToHsl(r / count / 255, g / count / 255, b / count / 255)
    if (s < 0.15) continue
    const mid = 1 - Math.abs(l - 0.5) * 2
    const score = count * s * s * (0.25 + 0.75 * mid)
    if (score > bestScore) {
      bestScore = score
      best = [h, s, l]
    }
  }

  if (best === null) return fallbackCardColor
  // clamp into the band where the white card text stays readable, light and dark mode alike
  return hslToHex(best[0], clamp(best[1], 0.2, 0.85), clamp(best[2], 0.3, 0.58))
}

// same diagonal three-stop language as the preset gradients, derived from one hex
export function cardColorGradient(hex: string): string {
  const [h, s, l] = hexToHsl(hex)
  const from = hslToHex(h - 8, s, Math.min(l + 0.12, 0.7))
  const to = hslToHex(h + 14, s, Math.max(l - 0.16, 0.12))
  return `linear-gradient(to bottom right, ${from}, ${hex}, ${to})`
}

// single switch for every card face render site: custom color wins over the preset theme
export function cardFace(card: Pick<Card, 'theme' | 'color'>): {
  className: string
  style: { background: string } | undefined
} {
  if (card.color === undefined) return { className: cardThemeGradients[card.theme], style: undefined }
  return { className: '', style: { background: cardColorGradient(card.color) } }
}
