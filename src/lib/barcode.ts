import { toSVG } from '@bwip-js/browser'
import type { BarcodeFormat } from '@/lib/cards'

export function renderBarcodeSvg(value: string, format: BarcodeFormat): string {
  return toSVG({
    bcid: format,
    text: value,
    scale: 3,
    ...(format !== 'qrcode' && { height: 15 }),
  })
}

export function renderMiniBarcodeSvg(value: string, format: BarcodeFormat): string {
  return toSVG({
    bcid: format,
    text: value,
    scale: 2,
    ...(format !== 'qrcode' && { height: 8 }),
  })
}
