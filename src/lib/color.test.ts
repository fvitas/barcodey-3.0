import { describe, expect, it } from 'vitest'
import { cardColorGradient, cardFace, extractCardColor, fallbackCardColor, hexToHsl, hslToHex } from '@/lib/color'
import { cardThemeGradients } from '@/lib/model'

// each entry is [r, g, b, count]: an opaque block of `count` identical pixels
function pixels(colors: Array<[number, number, number, number]>): { data: Uint8ClampedArray } {
  const expanded = colors.flatMap(([r, g, b, count]) => Array.from({ length: count }, () => [r, g, b] as const))
  const data = new Uint8ClampedArray(expanded.length * 4)
  expanded.forEach(([r, g, b], index) => data.set([r, g, b, 255], index * 4))
  return { data }
}

describe('hex/hsl round-trip', () => {
  it('round-trips saturated colors', () => {
    for (const hex of ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b']) {
      const [h, s, l] = hexToHsl(hex)
      expect(hslToHex(h, s, l)).toBe(hex)
    }
  })

  it('handles grays without hue artifacts', () => {
    expect(hexToHsl('#808080')[1]).toBe(0)
    expect(hslToHex(0, 0, 0.5)).toBe('#808080')
  })
})

describe('extractCardColor', () => {
  it('lets a saturated logo beat a white background', () => {
    // 90% white plastic, 10% brand green — the green must win
    const hex = extractCardColor(pixels([[255, 255, 255, 90], [22, 163, 74, 10]]))
    const [h, s] = hexToHsl(hex)
    expect(s).toBeGreaterThan(0.15)
    expect(h).toBeGreaterThan(90)
    expect(h).toBeLessThan(170)
  })

  it('falls back on a colorless photo', () => {
    expect(extractCardColor(pixels([[240, 240, 240, 50], [128, 128, 128, 30], [30, 30, 30, 20]]))).toBe(
      fallbackCardColor,
    )
    expect(extractCardColor({ data: new Uint8ClampedArray(0) })).toBe(fallbackCardColor)
  })

  it('clamps lightness so white text stays readable', () => {
    // a very light but saturated pink must come back darkened, not pastel
    const light = extractCardColor(pixels([[255, 180, 220, 100]]))
    expect(hexToHsl(light)[2]).toBeLessThanOrEqual(0.59)
    // a near-black red must come back lifted
    const dark = extractCardColor(pixels([[60, 5, 5, 100]]))
    expect(hexToHsl(dark)[2]).toBeGreaterThanOrEqual(0.29)
  })

  it('ignores transparent pixels', () => {
    const data = new Uint8ClampedArray([22, 163, 74, 40, 255, 0, 0, 255])
    const [h] = hexToHsl(extractCardColor({ data }))
    expect(h).toBeLessThan(15) // the opaque red wins; the transparent green never counts
  })
})

describe('cardColorGradient', () => {
  it('builds a three-stop diagonal with the base color in the middle', () => {
    const gradient = cardColorGradient('#22c55e')
    expect(gradient).toMatch(/^linear-gradient\(to bottom right, #[0-9a-f]{6}, #22c55e, #[0-9a-f]{6}\)$/)
  })

  it('keeps the derived stops in lightness order', () => {
    const [from, base, to] = cardColorGradient('#3b82f6')
      .replace(/^linear-gradient\(to bottom right, |\)$/g, '')
      .split(', ')
    expect(hexToHsl(from)[2]).toBeGreaterThan(hexToHsl(base)[2])
    expect(hexToHsl(to)[2]).toBeLessThan(hexToHsl(base)[2])
  })
})

describe('cardFace', () => {
  it('uses the preset gradient class when no custom color is set', () => {
    expect(cardFace({ theme: 'ocean', color: undefined })).toEqual({
      className: cardThemeGradients.ocean,
      style: undefined,
    })
  })

  it('uses an inline gradient when a custom color is set', () => {
    const face = cardFace({ theme: 'ocean', color: '#22c55e' })
    expect(face.className).toBe('')
    expect(face.style).toEqual({ background: cardColorGradient('#22c55e') })
  })
})
