import { describe, expect, it } from 'vitest'
import { renderBarcodeSvg } from '@/lib/barcode'
import { barcodeFormats } from '@/lib/model'
import { sampleCardPool } from '@/lib/sample-card'

describe('sampleCardPool', () => {
  it('covers every barcode format', () => {
    const covered = new Set(sampleCardPool.map(sample => sample.format))
    expect([...barcodeFormats].filter(format => !covered.has(format))).toEqual([])
  })

  it.each(sampleCardPool)('renders $name ($format)', sample => {
    expect(renderBarcodeSvg(sample.value, sample.format)).not.toBeNull()
  })
})
