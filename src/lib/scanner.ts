import { Capacitor } from '@capacitor/core'
import type { BarcodeFormat } from '@/lib/model'

export type ScanResult = { value: string; format: BarcodeFormat }

export const hasNativeScanner = Capacitor.isNativePlatform()

const zxingFormats: Record<string, BarcodeFormat> = {
  'EAN-13': 'ean13',
  'EAN-8': 'ean8',
  'UPC-A': 'upca',
  'UPC-E': 'upce',
  Code128: 'code128',
  Code39: 'code39',
  Code93: 'code93',
  Codabar: 'codabar',
  ITF: 'itf',
  QRCode: 'qrcode',
  Aztec: 'aztec',
  DataMatrix: 'datamatrix',
  PDF417: 'pdf417',
}

const mlkitFormats: Record<string, BarcodeFormat> = {
  EAN_13: 'ean13',
  EAN_8: 'ean8',
  UPC_A: 'upca',
  UPC_E: 'upce',
  CODE_128: 'code128',
  CODE_39: 'code39',
  CODE_93: 'code93',
  CODABAR: 'codabar',
  ITF: 'itf',
  QR_CODE: 'qrcode',
  AZTEC: 'aztec',
  DATA_MATRIX: 'datamatrix',
  PDF_417: 'pdf417',
}

// browser path: the add drawer feeds camera frames here
export async function scanImage(image: ImageData): Promise<ScanResult | null> {
  const { readBarcodes } = await import('zxing-wasm/reader')
  const results = await readBarcodes(image, { tryHarder: true, maxNumberOfSymbols: 1 })
  const first = results[0]
  if (!first || !first.isValid) return null
  const format = zxingFormats[first.format]
  return format === undefined ? null : { value: first.text, format }
}

// native path: ML Kit full-screen scanner (wired when platforms are added)
export async function scanWithNativeScanner(): Promise<ScanResult | null> {
  const { BarcodeScanner } = await import('@capacitor-mlkit/barcode-scanning')
  const { barcodes } = await BarcodeScanner.scan()
  const first = barcodes[0]
  if (!first || !first.rawValue) return null
  const format = mlkitFormats[first.format]
  return format === undefined ? null : { value: first.rawValue, format }
}
