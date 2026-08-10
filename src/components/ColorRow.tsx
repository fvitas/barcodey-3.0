import { CameraIcon, PaletteIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { cardColorGradient } from '@/lib/color'
import { cardThemeGradients, cardThemes, type CardPhotos, type CardTheme } from '@/lib/model'
import { extractPhotoColor } from '@/lib/photo-color'
import { pressable } from '@/lib/utils'

const selectedRing = 'ring-2 ring-primary ring-offset-2 ring-offset-card'
// bg-origin-border everywhere: pressable's 1px transparent border otherwise makes
// padding-box-sized gradients tile into the border ring (colored fringes on the edges)
// six hard-stop wedges in iOS system colors — a wheel, not a blended rainbow
const rainbow =
  'conic-gradient(#ff2d55 0deg 60deg, #ff9f0a 60deg 120deg, #30d158 120deg 180deg, #64d2ff 180deg 240deg, #0a84ff 240deg 300deg, #bf5af2 300deg 360deg)'

export function useExtractedPhotoColor(photos: CardPhotos): string | null {
  const path = photos.front ?? photos.back
  // the last extraction survives photo removal so the swatch (and its ring) doesn't vanish mid-edit
  const [extracted, setExtracted] = useState<string | null>(null)

  useEffect(() => {
    if (path === undefined) return
    let cancelled = false
    void extractPhotoColor(path).then(hex => {
      if (!cancelled && hex !== null) setExtracted(hex)
    })
    return () => {
      cancelled = true
    }
  }, [path])

  return extracted
}

type ColorRowProps = {
  theme: CardTheme
  color: string | undefined
  photos: CardPhotos
  onPickTheme: (theme: CardTheme) => void
  onPickColor: (color: string) => void
}

export function ColorRow({ theme, color, photos, onPickTheme, onPickColor }: ColorRowProps) {
  const extracted = useExtractedPhotoColor(photos)
  const [pickerOpen, setPickerOpen] = useState(false)
  const customSelected = color !== undefined && color !== extracted

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {cardThemes.map(option => (
          <button
            key={option}
            aria-label={option}
            onClick={() => {
              setPickerOpen(false)
              onPickTheme(option)
            }}
            className={`${pressable} size-9 rounded-full bg-origin-border ${cardThemeGradients[option]} ${
              color === undefined && option === theme ? selectedRing : ''
            }`}
          />
        ))}

        {extracted !== null && (
          <button
            aria-label="Photo color"
            onClick={() => onPickColor(extracted)}
            style={{ backgroundImage: cardColorGradient(extracted) }}
            className={`${pressable} flex size-9 items-center justify-center rounded-full bg-origin-border ${
              color === extracted ? selectedRing : ''
            }`}
          >
            <CameraIcon className="size-4 text-white/85" />
          </button>
        )}

        <button
          aria-label="Custom color"
          onClick={() => setPickerOpen(open => !open)}
          style={{ backgroundImage: customSelected && color !== undefined ? cardColorGradient(color) : rainbow }}
          className={`${pressable} flex size-9 items-center justify-center rounded-full bg-origin-border ${
            customSelected ? selectedRing : ''
          }`}
        >
          <PaletteIcon className="size-4 text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.35)]" />
        </button>
      </div>

      {pickerOpen && (
        // vaul otherwise reads a downward saturation/hue drag as drag-to-close
        <div className="mt-3 [&_.react-colorful]:h-40 [&_.react-colorful]:w-full" data-vaul-no-drag>
          <HexColorPicker color={color ?? '#4f46e5'} onChange={onPickColor} />
        </div>
      )}
    </div>
  )
}
