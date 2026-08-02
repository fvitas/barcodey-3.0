import { cardThemes, type BarcodeFormat, type Card } from '@/lib/model'

// dev-only helper — values have valid checksums so every format renders
const samples: { name: string; value: string; format: BarcodeFormat }[] = [
  { name: 'Lidl Plus', value: '4006381333931', format: 'ean13' },
  { name: 'Maxi', value: 'MAXI-8412-0993', format: 'code128' },
  { name: 'IKEA Family', value: '634158488282', format: 'code128' },
  { name: 'dm active beauty', value: '5901234123457', format: 'ean13' },
  { name: 'Decathlon', value: '2094857312', format: 'code128' },
  { name: 'Starbucks', value: 'BARCODEY-STAR-8842', format: 'qrcode' },
  { name: 'IDEA', value: '9780201379624', format: 'ean13' },
  { name: 'Tempo', value: 'TMP-99-04412', format: 'code128' },
  { name: 'Library', value: '96385074', format: 'ean8' },
]

export function createSampleCard(): Card {
  const sample = samples[Math.floor(Math.random() * samples.length)]
  const theme = cardThemes[Math.floor(Math.random() * cardThemes.length)]
  const daysAgo = Math.floor(Math.random() * 365)

  return {
    id: crypto.randomUUID(),
    name: sample.name,
    value: sample.value,
    format: sample.format,
    theme,
    favorite: false,
    addedAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10),
    folderId: null,
    photos: {},
  }
}
