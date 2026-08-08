import { useEffect, useState } from 'react'
import type { BarcodeFormat } from '@/lib/model'

type BarcodeModule = typeof import('@/lib/barcode')

let barcodeModule: BarcodeModule | null = null
let modulePromise: Promise<BarcodeModule> | null = null

// bwip-js is ~30% of the main bundle — loaded lazily and warmed after first
// paint so the chunk is ready before the first pass expands
export function warmBarcodeRenderer(): Promise<BarcodeModule> {
  modulePromise ??= import('@/lib/barcode').then(module => {
    barcodeModule = module
    return module
  })
  return modulePromise
}

// null marks values bwip-js rejected, so invalid codes don't re-encode either
const svgCache = new Map<string, string | null>()

// undefined = renderer chunk still loading (or no value), null = invalid value
export function useBarcodeSvg(
  value: string | undefined,
  format: BarcodeFormat | undefined,
): string | null | undefined {
  const [ready, setReady] = useState(barcodeModule !== null)

  useEffect(() => {
    if (ready) return
    let cancelled = false
    void warmBarcodeRenderer().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [ready])

  if (!ready || barcodeModule === null || value === undefined || format === undefined) return undefined

  const key = `${format}:${value}`
  if (!svgCache.has(key)) svgCache.set(key, barcodeModule.renderBarcodeSvg(value, format))
  return svgCache.get(key)
}
