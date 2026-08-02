import { Capacitor } from '@capacitor/core'

let savedBrightness: number | null = null

export async function boostBrightness(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { ScreenBrightness } = await import('@capacitor-community/screen-brightness')
    if (savedBrightness === null) {
      const { brightness } = await ScreenBrightness.getBrightness()
      savedBrightness = brightness
    }
    await ScreenBrightness.setBrightness({ brightness: 1 })
  } catch {
    // plugin unavailable — never block showing the barcode
  }
}

export async function restoreBrightness(): Promise<void> {
  if (!Capacitor.isNativePlatform() || savedBrightness === null) return
  try {
    const { ScreenBrightness } = await import('@capacitor-community/screen-brightness')
    await ScreenBrightness.setBrightness({ brightness: savedBrightness })
    savedBrightness = null
  } catch {
    savedBrightness = null
  }
}
