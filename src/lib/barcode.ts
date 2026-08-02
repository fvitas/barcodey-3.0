import { toSVG } from '@bwip-js/browser'
import { squareFormats, type BarcodeFormat } from '@/lib/model'

const bcids: Record<BarcodeFormat, string> = {
  ean13: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  upce: 'upce',
  code128: 'code128',
  code39: 'code39',
  code93: 'code93',
  codabar: 'rationalizedCodabar',
  itf: 'interleaved2of5',
  qrcode: 'qrcode',
  aztec: 'azteccode',
  datamatrix: 'datamatrix',
  pdf417: 'pdf417',
}

// returns null when the value is invalid for the symbology (bwip-js throws)
export function renderBarcodeSvg(value: string, format: BarcodeFormat): string | null {
  const linear = !squareFormats.has(format) && format !== 'pdf417'
  try {
    return toSVG({
      bcid: bcids[format],
      text: value,
      scale: 3,
      ...(linear && { height: 15 }),
    })
  } catch {
    return null
  }
}
