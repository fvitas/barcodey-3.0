import { z } from 'zod'

const brandSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  countries: z.array(z.string()), // lowercase ISO codes, or '001' for worldwide
  cat: z.string(),
  color: z.string().regex(/^#[0-9a-f]{6}$/),
})

const brandCatalogSchema = z.object({
  version: z.literal(1),
  brands: z.array(brandSchema),
})

export type Brand = z.infer<typeof brandSchema>

export function brandLogoSrc(brandId: string): string {
  return `/brands/${brandId}.webp`
}

export function brandCategoryLabel(brand: Brand): string {
  const label = brand.cat.replace(/_/g, ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function userCountry(): string | undefined {
  try {
    return new Intl.Locale(navigator.language).region?.toLowerCase()
  } catch {
    return undefined
  }
}

export function userCountryName(): string {
  const region = userCountry()
  if (region === undefined) return ''
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(region.toUpperCase()) ?? ''
  } catch {
    return ''
  }
}

function inCountry(brand: Brand, country: string | undefined): boolean {
  return country !== undefined && (brand.countries.includes(country) || brand.countries.includes('001'))
}

// rank: name prefix > alias prefix > name substring > alias substring; local brands before
// foreign ones within a rank, then shorter names (closer match) first
export function searchBrands(brands: Brand[], query: string, country: string | undefined): Brand[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return []
  const scored: { brand: Brand; score: number }[] = []
  for (const brand of brands) {
    const name = brand.name.toLowerCase()
    const aliases = brand.aliases ?? []
    let score = 0
    if (name.startsWith(needle)) score = 4
    else if (aliases.some(alias => alias.startsWith(needle))) score = 3
    else if (name.includes(needle)) score = 2
    else if (aliases.some(alias => alias.includes(needle))) score = 1
    if (score === 0) continue
    if (inCountry(brand, country)) score += 0.5
    scored.push({ brand, score })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.brand.name.length - b.brand.name.length)
    .map(entry => entry.brand)
}

export type BrandGroup = { letter: string; brands: Brand[] }

// A–Z sections for the picker; digits and non-latin initials pool under '#'
export function groupBrandsByLetter(brands: Brand[]): BrandGroup[] {
  const groups = new Map<string, Brand[]>()
  for (const brand of brands) {
    const initial = brand.name.charAt(0).toUpperCase()
    const letter = /[A-Z]/.test(initial) ? initial : '#'
    const group = groups.get(letter) ?? []
    group.push(brand)
    groups.set(letter, group)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([letter, grouped]) => ({ letter, brands: grouped.sort((a, b) => a.name.localeCompare(b.name)) }))
}

let catalogPromise: Promise<Brand[]> | null = null

export function loadBrandCatalog(): Promise<Brand[]> {
  // a failed load must not stick for the session — drop the cache and retry next call
  catalogPromise ??= fetch('/brands/catalog.json')
    .then(response => {
      if (!response.ok) throw new Error(`catalog HTTP ${response.status}`)
      return response.json()
    })
    .then(json => brandCatalogSchema.parse(json).brands)
    .catch((error: unknown) => {
      catalogPromise = null
      throw error
    })
  return catalogPromise
}
