import { extractCardColor } from '@/lib/color'
import { loadPhotoSrc } from '@/lib/photos'

// photo paths are immutable (rotation writes a new file), so extractions never go stale
const colorCache = new Map<string, string>()

export async function extractPhotoColor(path: string): Promise<string | null> {
  const cached = colorCache.get(path)
  if (cached !== undefined) return cached
  const src = await loadPhotoSrc(path)
  if (src === null) return null
  try {
    const response = await fetch(src)
    const bitmap = await createImageBitmap(await response.blob())
    // a thumbnail is plenty for a dominant color, and keeps extraction at a few ms
    const scale = Math.min(1, 48 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (context === null) return null
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const hex = extractCardColor(context.getImageData(0, 0, canvas.width, canvas.height))
    colorCache.set(path, hex)
    return hex
  } catch {
    return null
  }
}
