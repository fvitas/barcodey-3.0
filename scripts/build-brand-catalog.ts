// Brand catalog pipeline — merges name-suggestion-index (names, aliases, countries, QIDs),
// Wikidata (logo P154, brand color P465) and Wikimedia Commons (logo files) into the
// bundled catalog: public/brands/catalog.json + public/brands/<id>.webp
//
// run: node scripts/build-brand-catalog.ts [--only shop/supermarket] [--limit 50]
// Downloads are cached in scripts/.cache/ — delete it to force a full refresh.

import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
const cacheDir = path.join(scriptsDir, '.cache')
const outDir = path.join(scriptsDir, '..', 'public', 'brands')
// Wikimedia's bot policy 429s user agents without contact info — keep the URL in
const userAgent = 'barcodey-brand-catalog/1.0 (https://github.com/fvitas/barcodey-3.0)'

// NSI categories where loyalty/membership cards are a thing
const categories = [
  'shop/supermarket',
  'shop/convenience',
  'shop/department_store',
  'shop/variety_store',
  'shop/clothes',
  'shop/shoes',
  'shop/chemist',
  'shop/cosmetics',
  'shop/perfumery',
  'shop/furniture',
  'shop/electronics',
  'shop/mobile_phone',
  'shop/sports',
  'shop/books',
  'shop/stationery',
  'shop/toys',
  'shop/baby_goods',
  'shop/pet',
  'shop/doityourself',
  'shop/hardware',
  'shop/houseware',
  'shop/jewelry',
  'shop/optician',
  'shop/bakery',
  'shop/butcher',
  'shop/coffee',
  'shop/tea',
  'shop/alcohol',
  'shop/health_food',
  'shop/gift',
  'shop/kiosk',
  'amenity/fast_food',
  'amenity/cafe',
  'amenity/fuel',
  'amenity/pharmacy',
  'amenity/cinema',
  'leisure/fitness_centre',
]

type NsiItem = {
  displayName: string
  id: string
  locationSet?: { include?: unknown[]; exclude?: unknown[] }
  matchNames?: string[]
  tags?: Record<string, string>
}

type Brand = {
  id: string
  qid: string
  name: string
  nameGlobal: boolean // name came from a worldwide ('001') NSI entry — canonical over locale variants
  aliases: string[]
  countries: string[]
  cat: string
  color?: string
  logoUrl?: string
}

function parseArgs(): { only: string | undefined; limit: number } {
  const args = process.argv.slice(2)
  const onlyIndex = args.indexOf('--only')
  const limitIndex = args.indexOf('--limit')
  return {
    only: onlyIndex === -1 ? undefined : args[onlyIndex + 1],
    limit: limitIndex === -1 ? Infinity : Number(args[limitIndex + 1]),
  }
}

async function fetchWithRetry(url: string, init?: RequestInit, tries = 5): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    let backoff = 1_500 * attempt
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(30_000),
        headers: { 'user-agent': userAgent, ...init?.headers },
      })
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get('retry-after'))
        // penalty-box Retry-After values can be hours — cap so workers never park
        backoff = Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 5_000 * attempt, 30_000)
        throw new Error(`HTTP 429`)
      }
      if (response.status >= 500) throw new Error(`HTTP ${response.status}`)
      return response
    } catch (error) {
      if (attempt >= tries) throw error
      console.warn(`retry ${attempt} (${String(error)}) ${url.slice(0, 90)}`)
      await new Promise(resolve => setTimeout(resolve, backoff))
    }
  }
}

async function cached(key: string, load: () => Promise<Buffer | string>): Promise<Buffer> {
  const file = path.join(cacheDir, key)
  try {
    return await readFile(file)
  } catch {
    const data = await load()
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, data)
    return Buffer.from(data)
  }
}

async function pool<T, R>(items: T[], size: number, work: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await work(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, worker))
  return results
}

// --- color extraction (standalone copy of src/lib/color.ts — that module imports via the
// @/ alias which plain node can't resolve; keep the scoring in sync if the app version changes)

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
  return [(h * 60 + 360) % 360, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  const sector = Math.floor(hue / 60)
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector]
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function extractColor(data: Uint8ClampedArray): string | undefined {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
    bucket.count += 1
    bucket.r += r
    bucket.g += g
    bucket.b += b
    buckets.set(key, bucket)
  }
  let best: { score: number; r: number; g: number; b: number } | undefined
  for (const bucket of buckets.values()) {
    const r = bucket.r / bucket.count / 255
    const g = bucket.g / bucket.count / 255
    const b = bucket.b / bucket.count / 255
    const [, s, l] = rgbToHsl(r, g, b)
    if (s < 0.15) continue
    const mid = 1 - Math.abs(l - 0.5) * 2
    const score = bucket.count * s * s * (0.25 + 0.75 * mid)
    if (best === undefined || score > best.score) best = { score, r, g, b }
  }
  if (best === undefined) return undefined
  const [h, s, l] = rgbToHsl(best.r, best.g, best.b)
  return hslToHex(h, Math.min(Math.max(s, 0.2), 0.85), Math.min(Math.max(l, 0.3), 0.58))
}

// --- pipeline stages

// NSI lists locale variants of global brands as separate items sharing one QID —
// prefer ASCII names (イケア must not beat IKEA), then the shortest
function betterName(a: string, b: string): string {
  const asciiA = /^[\x20-\x7e]+$/.test(a)
  const asciiB = /^[\x20-\x7e]+$/.test(b)
  if (asciiA !== asciiB) return asciiA ? a : b
  return b.length < a.length ? b : a
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function collectNsi(only: string | undefined): Promise<Map<string, Brand>> {
  const byQid = new Map<string, Brand>()
  const selected = only === undefined ? categories : categories.filter(category => category === only)
  for (const category of selected) {
    const url = `https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/data/brands/${category}.json`
    let items: NsiItem[]
    try {
      const raw = await cached(`nsi/${category.replace('/', '_')}.json`, async () => {
        const response = await fetchWithRetry(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return Buffer.from(await response.arrayBuffer())
      })
      items = (JSON.parse(raw.toString()) as { items: NsiItem[] }).items
    } catch (error) {
      console.warn(`skip ${category}: ${String(error)}`)
      continue
    }
    for (const item of items) {
      const qid = item.tags?.['brand:wikidata']
      if (qid === undefined || !/^Q\d+$/.test(qid)) continue
      const countries = (item.locationSet?.include ?? ['001']).filter(
        (entry): entry is string => typeof entry === 'string',
      )
      const aliases = (item.matchNames ?? []).map(alias => alias.toLowerCase())
      const itemGlobal = countries.includes('001') || countries.length === 0
      const existing = byQid.get(qid)
      if (existing === undefined) {
        byQid.set(qid, {
          id: slugify(item.displayName) || qid.toLowerCase(),
          qid,
          name: item.displayName,
          nameGlobal: itemGlobal,
          aliases,
          countries: countries.length > 0 ? countries : ['001'],
          cat: category.split('/')[1],
        })
      } else {
        // same brand listed in several categories/regions — union countries, keep every
        // name variant as a searchable alias, and let the canonical display name win:
        // worldwide entry beats locale variants (Starbucks over Serbia's "Starbaks"),
        // ascii/shortest breaks ties within the same scope
        existing.countries = [...new Set([...existing.countries, ...countries])]
        existing.aliases = [
          ...new Set([...existing.aliases, ...aliases, item.displayName.toLowerCase(), existing.name.toLowerCase()]),
        ]
        if (itemGlobal && !existing.nameGlobal) {
          existing.name = item.displayName
          existing.nameGlobal = true
        } else if (itemGlobal === existing.nameGlobal) {
          existing.name = betterName(existing.name, item.displayName)
        }
      }
    }
    console.log(`${category}: ${items.length} items, ${byQid.size} unique brands so far`)
  }
  // world membership makes per-country lists redundant; the id follows the FINAL
  // merged name, not the first-seen variant's
  for (const brand of byQid.values()) {
    if (brand.countries.includes('001')) brand.countries = ['001']
    brand.aliases = brand.aliases.filter(alias => alias !== brand.name.toLowerCase())
    brand.id = slugify(brand.name) || brand.qid.toLowerCase()
  }
  return byQid
}

async function fetchWikidata(brands: Brand[]): Promise<void> {
  const chunkSize = 150
  for (let start = 0; start < brands.length; start += chunkSize) {
    const chunk = brands.slice(start, start + chunkSize)
    const values = chunk.map(brand => `wd:${brand.qid}`).join(' ')
    const query = `SELECT ?item (SAMPLE(?logo) AS ?logoUrl) (SAMPLE(?color) AS ?hex) WHERE {
      VALUES ?item { ${values} }
      ?item wdt:P154 ?logo .
      OPTIONAL { ?item wdt:P465 ?color }
    } GROUP BY ?item`
    const raw = await cached(`sparql/${chunk[0].qid}-${chunk.length}.json`, async () => {
      const response = await fetchWithRetry(
        `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
        { headers: { accept: 'application/sparql-results+json' } },
      )
      if (!response.ok) throw new Error(`SPARQL HTTP ${response.status}`)
      return Buffer.from(await response.arrayBuffer())
    })
    type Binding = { item: { value: string }; logoUrl?: { value: string }; hex?: { value: string } }
    const bindings = (JSON.parse(raw.toString()) as { results: { bindings: Binding[] } }).results.bindings
    const byQid = new Map(chunk.map(brand => [brand.qid, brand]))
    for (const binding of bindings) {
      const brand = byQid.get(binding.item.value.split('/').pop() ?? '')
      if (brand === undefined) continue
      brand.logoUrl = binding.logoUrl?.value.replace('http://', 'https://')
      const hex = binding.hex?.value.trim().toLowerCase()
      if (hex !== undefined && /^[0-9a-f]{6}$/.test(hex)) brand.color = `#${hex}`
    }
    console.log(`wikidata: ${Math.min(start + chunkSize, brands.length)}/${brands.length}`)
  }
}

// a single pathological Commons file can grind libvips for hours and wedge the
// threadpool-backed pool — race each brand against a hard timeout and move on
async function processLogo(brand: Brand): Promise<{ webp: Buffer; color: string } | undefined> {
  const timeout = new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 60_000))
  const started = Date.now()
  const result = await Promise.race([processLogoInner(brand), timeout])
  const elapsed = Date.now() - started
  if (elapsed > 10_000) console.warn(`slow (${Math.round(elapsed / 1000)}s${result === undefined ? ', SKIPPED' : ''}): ${brand.name} ${brand.qid}`)
  return result
}

async function processLogoInner(brand: Brand): Promise<{ webp: Buffer; color: string } | undefined> {
  if (brand.logoUrl === undefined) return undefined
  try {
    // Special:FilePath and the thumb service both rate-limit hard; the upload CDN does not.
    // Its path scheme is /<md5[0]>/<md5[0..2]>/<File_Name> over the underscored filename.
    const filename = decodeURIComponent(brand.logoUrl.split('/').pop() ?? '').replace(/ /g, '_')
    const hash = createHash('md5').update(filename).digest('hex')
    const directUrl = `https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0, 2)}/${encodeURIComponent(filename)}`
    const source = await cached(`logos/${brand.qid}`, async () => {
      await new Promise(resolve => setTimeout(resolve, 150))
      const response = await fetchWithRetry(directUrl, undefined, 6)
      if (!response.ok) throw new Error(`logo HTTP ${response.status}`)
      return Buffer.from(await response.arrayBuffer())
    })
    // density 192 renders SVGs oversized so the downscale to 96px stays crisp
    let image = sharp(source, { density: 192 })
    try {
      // most Commons logos ship with generous padding — trim to the mark itself
      const trimmed = await image.trim().toBuffer()
      image = sharp(trimmed)
    } catch {
      // trim fails on fully-uniform images; keep the original
    }
    const webp = await image
      .resize(96, 96, { fit: 'inside', withoutEnlargement: false })
      .webp({ quality: 82 })
      .toBuffer()
    let color = brand.color
    if (color === undefined) {
      const { data } = await sharp(webp)
        .resize(48, 48, { fit: 'inside' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      color = extractColor(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength))
    }
    return { webp, color: color ?? '#475569' }
  } catch (error) {
    console.warn(`logo failed ${brand.name} (${brand.qid}): ${String(error)}`)
    return undefined
  }
}

type SeedBrand = {
  id: string
  name: string
  aliases?: string[]
  countries?: string[]
  cat?: string
  color?: string
  logo: string // path relative to scripts/, e.g. seed-logos/maxi.png
}

async function loadSeeds(): Promise<{ brand: Brand; file: string }[]> {
  try {
    const raw = await readFile(path.join(scriptsDir, 'brand-seed.json'), 'utf8')
    const seeds = (JSON.parse(raw) as { brands: SeedBrand[] }).brands
    return seeds.map(seed => ({
      brand: {
        id: seed.id,
        qid: '',
        name: seed.name,
        aliases: seed.aliases ?? [],
        countries: seed.countries ?? ['001'],
        cat: seed.cat ?? 'other',
        color: seed.color,
      },
      file: path.join(scriptsDir, seed.logo),
    }))
  } catch {
    return []
  }
}

async function main() {
  const { only, limit } = parseArgs()
  await mkdir(outDir, { recursive: true })

  const byQid = await collectNsi(only)
  let brands = [...byQid.values()]
  // Filip 2026-08-11: drop Chinese-named brands (Han name + only in Greater China);
  // Japanese kana/Han chains stay — Han alone doesn't identify the language
  const han = /[⺀-鿿豈-﫿]/
  const greaterChina = new Set(['cn', 'hk', 'tw', 'mo'])
  const beforeCut = brands.length
  brands = brands.filter(
    brand => !(han.test(brand.name) && brand.countries.every(country => greaterChina.has(country))),
  )
  console.log(`chinese-name cut: ${beforeCut - brands.length}`)
  if (brands.length > limit) brands = brands.slice(0, limit)
  console.log(`\nNSI total: ${brands.length} brands with QIDs`)

  await fetchWikidata(brands)
  const withLogo = brands.filter(brand => brand.logoUrl !== undefined)
  console.log(`with Wikidata logo: ${withLogo.length}`)

  // ids must be unique after the qid-dedup — disambiguate collisions with a qid suffix
  const seen = new Set<string>()
  for (const brand of withLogo) {
    if (seen.has(brand.id)) brand.id = `${brand.id}-${brand.qid.toLowerCase()}`
    seen.add(brand.id)
  }

  const entries: { id: string; name: string; aliases?: string[]; countries: string[]; cat: string; color: string }[] =
    []
  // manifest of already-processed logos (qid → extracted color) makes re-runs near-instant
  const manifestPath = path.join(cacheDir, 'processed.json')
  let manifest: Record<string, string> = {}
  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    // first run
  }
  let done = 0
  await pool(withLogo, 4, async brand => {
    done += 1
    if (done % 100 === 0) console.log(`logos: ${done}/${withLogo.length}`)
    let color = manifest[brand.qid]
    if (color === undefined || !(await stat(path.join(outDir, `${brand.id}.webp`)).catch(() => false))) {
      const processed = await processLogo(brand)
      if (processed === undefined) return
      await writeFile(path.join(outDir, `${brand.id}.webp`), processed.webp)
      color = processed.color
      manifest[brand.qid] = color
    }
    entries.push({
      id: brand.id,
      name: brand.name,
      aliases: brand.aliases.length > 0 ? brand.aliases : undefined,
      countries: brand.countries,
      cat: brand.cat,
      color,
    })
  })
  await writeFile(manifestPath, JSON.stringify(manifest))

  for (const { brand, file } of await loadSeeds()) {
    try {
      const source = await readFile(file)
      const webp = await sharp(source).resize(96, 96, { fit: 'inside' }).webp({ quality: 82 }).toBuffer()
      await writeFile(path.join(outDir, `${brand.id}.webp`), webp)
      let color = brand.color
      if (color === undefined) {
        const { data } = await sharp(webp).resize(48, 48, { fit: 'inside' }).ensureAlpha().raw().toBuffer({
          resolveWithObject: true,
        })
        color = extractColor(new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength)) ?? '#475569'
      }
      entries.push({
        id: brand.id,
        name: brand.name,
        aliases: brand.aliases.length > 0 ? brand.aliases : undefined,
        countries: brand.countries,
        cat: brand.cat,
        color,
      })
    } catch (error) {
      console.warn(`seed failed ${brand.name}: ${String(error)}`)
    }
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))
  const catalog = { version: 1, brands: entries }
  await writeFile(path.join(outDir, 'catalog.json'), JSON.stringify(catalog))

  // stale logos from previous runs would otherwise ship forever
  const valid = new Set([...entries.map(entry => `${entry.id}.webp`), 'catalog.json'])
  for (const file of await readdir(outDir)) {
    if (!valid.has(file)) await rm(path.join(outDir, file))
  }

  let totalBytes = 0
  for (const file of await readdir(outDir)) {
    totalBytes += (await stat(path.join(outDir, file))).size
  }
  console.log(`\ncatalog: ${entries.length} brands, public/brands total ${(totalBytes / 1_048_576).toFixed(2)} MB`)
}

await main()
// timed-out sharp ops may still hold threadpool slots — don't wait for them
process.exit(0)
