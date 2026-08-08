import {
  azteccode,
  code39,
  code93,
  code128,
  datamatrix,
  drawingSVG,
  ean8,
  ean13,
  interleaved2of5,
  pdf417,
  qrcode,
  rationalizedCodabar,
  upca,
  upce,
  type RenderOptions,
} from '@bwip-js/browser'
import { squareFormats, type BarcodeFormat } from '@/lib/model'

type Encoder = (opts: RenderOptions, drawing: ReturnType<typeof drawingSVG>) => string

// named encoder imports instead of toSVG so unused BWIPP symbologies tree-shake out of the bundle
const encoders: Record<BarcodeFormat, [bcid: string, encode: Encoder]> = {
  ean13: ['ean13', ean13],
  ean8: ['ean8', ean8],
  upca: ['upca', upca],
  upce: ['upce', upce],
  code128: ['code128', code128],
  code39: ['code39', code39],
  code93: ['code93', code93],
  codabar: ['rationalizedCodabar', rationalizedCodabar],
  itf: ['interleaved2of5', interleaved2of5],
  qrcode: ['qrcode', qrcode],
  aztec: ['azteccode', azteccode],
  datamatrix: ['datamatrix', datamatrix],
  pdf417: ['pdf417', pdf417],
}

// returns null when the value is invalid for the symbology (bwip-js throws)
export function renderBarcodeSvg(value: string, format: BarcodeFormat): string | null {
  const [bcid, encode] = encoders[format]
  const linear = !squareFormats.has(format) && format !== 'pdf417'
  // Code 93 mandates two check chars — scanners reject bwip's default output without them
  const check = format === 'code93' && { includecheck: true }
  try {
    return encode({ bcid, text: value, scale: 3, ...(linear && { height: 15 }), ...check }, drawingSVG())
  } catch {
    return null
  }
}
