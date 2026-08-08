import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import type { CardPhotos } from '@/lib/model'

const photosDirectory = Directory.Data
const maxDimension = 1_600
const jpegQuality = 0.8

async function downscaleToJpegDataUrl(file: File): Promise<string> {
  // from-image applies EXIF rotation so phone photos come out upright
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('canvas 2d context unavailable')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', jpegQuality)
}

async function writePhotoFile(dataUrl: string): Promise<string> {
  const path = `photos/${crypto.randomUUID()}.jpeg`
  await Filesystem.writeFile({
    path,
    directory: photosDirectory,
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    recursive: true,
  })
  return path
}

export async function savePhoto(file: File): Promise<string> {
  return writePhotoFile(await downscaleToJpegDataUrl(file))
}

// clockwise quarter turns — one code path for the adjuster preview and the baked file
export async function rotateToJpegDataUrl(src: string, quarters: number): Promise<string> {
  const blob = await (await fetch(src)).blob()
  const bitmap = await createImageBitmap(blob)
  const swap = quarters % 2 === 1
  const canvas = document.createElement('canvas')
  canvas.width = swap ? bitmap.height : bitmap.width
  canvas.height = swap ? bitmap.width : bitmap.height
  const context = canvas.getContext('2d')
  if (context === null) throw new Error('canvas 2d context unavailable')
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((quarters * Math.PI) / 2)
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', jpegQuality)
}

// bake pending rotations at save: each rotated photo becomes a new file (a reused path
// would show the browser's cached, unrotated image) and the old one is dropped
export async function bakePhotoRotations(
  photos: CardPhotos,
  rotations: Record<string, number>,
): Promise<CardPhotos> {
  const baked = { ...photos }
  let changed = false
  for (const side of ['front', 'back'] as const) {
    const path = photos[side]
    if (path === undefined) continue
    const quarters = (rotations[path] ?? 0) % 4
    if (quarters === 0) continue
    const src = await loadPhotoSrc(path)
    if (src === null) continue
    baked[side] = await writePhotoFile(await rotateToJpegDataUrl(src, quarters))
    await deletePhoto(path)
    changed = true
  }
  return changed ? baked : photos
}

export async function loadPhotoSrc(path: string): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      // serve the file directly instead of piping base64 over the bridge
      const { uri } = await Filesystem.getUri({ path, directory: photosDirectory })
      return Capacitor.convertFileSrc(uri)
    }
    const result = await Filesystem.readFile({ path, directory: photosDirectory })
    return `data:image/jpeg;base64,${result.data as string}`
  } catch {
    return null
  }
}

export async function deletePhoto(path: string): Promise<void> {
  await Filesystem.deleteFile({ path, directory: photosDirectory }).catch(() => {})
}

export async function deleteCardPhotos(photos: CardPhotos): Promise<void> {
  await Promise.all([photos.front, photos.back].filter(path => path !== undefined).map(deletePhoto))
}
