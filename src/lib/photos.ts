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

export async function savePhoto(file: File): Promise<string> {
  const dataUrl = await downscaleToJpegDataUrl(file)
  const path = `photos/${crypto.randomUUID()}.jpeg`
  await Filesystem.writeFile({
    path,
    directory: photosDirectory,
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    recursive: true,
  })
  return path
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
