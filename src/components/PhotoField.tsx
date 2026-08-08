import { CameraIcon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CardPhotos, PhotoSide } from '@/lib/model'
import { cachedPhotoSrc, deletePhoto, loadPhotoSrc, savePhoto } from '@/lib/photos'
import { pressable } from '@/lib/utils'

export function usePhotoSrc(path: string | undefined): string | null {
  // sync cache hit skips the placeholder flash on remounts
  const cached = path !== undefined ? cachedPhotoSrc(path) : undefined
  const [loaded, setLoaded] = useState<{ path: string; src: string } | null>(null)

  useEffect(() => {
    if (path === undefined || cachedPhotoSrc(path) !== undefined) return
    let cancelled = false
    void loadPhotoSrc(path).then(src => {
      if (!cancelled && src !== null) setLoaded({ path, src })
    })
    return () => {
      cancelled = true
    }
  }, [path])

  if (cached !== undefined) return cached
  // deriving from the loaded path also keeps a stale photo from flashing while the next one loads
  return loaded !== null && loaded.path === path ? loaded.src : null
}

const photoSides: PhotoSide[] = ['front', 'back']

type PhotoSlotProps = {
  side: PhotoSide
  path: string | undefined
  onPick: (side: PhotoSide, file: File) => void
  onRemove: (side: PhotoSide) => void
}

function PhotoSlot({ side, path, onPick, onRemove }: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const src = usePhotoSrc(path)

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file !== undefined) onPick(side, file)
  }

  return (
    <div className="relative aspect-[1.6] overflow-hidden rounded-xl">
      {path === undefined ? (
        <button
          onClick={() => inputRef.current?.click()}
          className={`${pressable} flex size-full flex-col items-center justify-center gap-1 rounded-xl border-2! border-dashed! border-input! text-muted-foreground hover:text-foreground`}
        >
          <CameraIcon className="size-4.5" />
          <span className="text-[0.625rem] font-semibold tracking-widest uppercase">{side}</span>
        </button>
      ) : (
        <>
          {src !== null ? (
            <img src={src} alt="" className="size-full object-cover" />
          ) : (
            <div className="size-full bg-muted" />
          )}
          <span className="absolute bottom-1.5 left-2 text-[0.625rem] font-bold tracking-widest text-white uppercase drop-shadow">
            {side}
          </span>
          <button
            onClick={() => onRemove(side)}
            aria-label={`Remove ${side} photo`}
            className={`${pressable} absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70`}
          >
            <XIcon className="size-3.5" />
          </button>
        </>
      )}
      {/* image/* in the webview offers Take Photo or Photo Library natively */}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

type PhotoFieldProps = {
  photos: CardPhotos
  onChange: (photos: CardPhotos) => void
}

export function PhotoField({ photos, onChange }: PhotoFieldProps) {
  function handlePick(side: PhotoSide, file: File) {
    void savePhoto(file).then(path => {
      const previous = photos[side]
      if (previous !== undefined) void deletePhoto(previous)
      onChange({ ...photos, [side]: path })
    })
  }

  function handleRemove(side: PhotoSide) {
    const previous = photos[side]
    if (previous !== undefined) void deletePhoto(previous)
    const next = { ...photos }
    delete next[side]
    onChange(next)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {photoSides.map(side => (
        <PhotoSlot key={side} side={side} path={photos[side]} onPick={handlePick} onRemove={handleRemove} />
      ))}
    </div>
  )
}
