import { RotateCwIcon } from 'lucide-react'
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Slider } from '@/components/ui/slider'
import type { CardCover } from '@/lib/model'
import { rotateToJpegDataUrl } from '@/lib/photos'
import { pressable } from '@/lib/utils'

// every cover frame (adjust preview, card and document faces) has the card aspect
const frameAspect = 1.586

type CoverImageProps = {
  cover: CardCover
  src: string
  imgRef?: React.Ref<HTMLImageElement>
}

// scale on a wrapper + %-translate on a centered contain-fit img: scale 1 shows the whole
// photo whatever its orientation, and the stored transform renders identically in any frame
// with the card aspect
export function CoverImage({ cover, src, imgRef }: CoverImageProps) {
  const localRef = useRef<HTMLImageElement | null>(null)
  const [tall, setTall] = useState(false)

  useImperativeHandle(imgRef, () => localRef.current as HTMLImageElement)

  function measure(img: HTMLImageElement) {
    if (img.naturalWidth > 0) setTall(img.naturalWidth < img.naturalHeight * frameAspect)
  }

  // measure before paint when the image is already decoded (rotate pre-decodes its data URL) —
  // waiting for onLoad painted one frame of the new image with the previous fit
  useLayoutEffect(() => {
    if (localRef.current !== null) measure(localRef.current)
  }, [src])

  return (
    <div style={{ transform: `scale(${cover.scale})` }} className="absolute inset-0">
      <img
        ref={localRef}
        src={src}
        alt=""
        draggable={false}
        onLoad={(event: React.SyntheticEvent<HTMLImageElement>) => measure(event.currentTarget)}
        style={{ transform: `translate(calc(-50% + ${cover.x * 100}%), calc(-50% + ${cover.y * 100}%))` }}
        className={`absolute top-1/2 left-1/2 max-w-none ${tall ? 'h-full w-auto' : 'h-auto w-full'}`}
      />
    </div>
  )
}

type CoverAdjustProps = {
  src: string
  cover: CardCover
  rotation: number
  onChange: (cover: CardCover) => void
  onRotate: () => void
}

export function CoverAdjust({ src, cover, rotation, onChange, onRotate }: CoverAdjustProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null)
  const [rotatedSrc, setRotatedSrc] = useState<string | null>(null)
  const turns = rotation % 4

  // rotate the pixels, not the CSS: the preview img IS the rotated image, so the
  // drag math and clamping below stay orientation-blind
  useEffect(() => {
    if (turns === 0) {
      setRotatedSrc(null)
      return
    }
    let cancelled = false
    void rotateToJpegDataUrl(src, turns).then(rotated => {
      if (!cancelled) setRotatedSrc(rotated)
    })
    return () => {
      cancelled = true
    }
  }, [src, turns])

  // keep the photo covering the frame — offsets are fractions of the displayed image size
  function clamped(next: CardCover): CardCover {
    const frame = frameRef.current
    const img = imgRef.current
    if (frame === null || img === null) return next
    const rect = img.getBoundingClientRect()
    const width = (rect.width / cover.scale) * next.scale
    const height = (rect.height / cover.scale) * next.scale
    const maxX = Math.max(0, (width - frame.clientWidth) / 2 / width)
    const maxY = Math.max(0, (height - frame.clientHeight) / 2 / height)
    return { ...next, x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (drag.current === null || drag.current.pointerId !== event.pointerId) return
    const img = imgRef.current
    if (img === null) return
    const rect = img.getBoundingClientRect()
    const next = clamped({
      ...cover,
      x: cover.x + (event.clientX - drag.current.lastX) / rect.width,
      y: cover.y + (event.clientY - drag.current.lastY) / rect.height,
    })
    drag.current.lastX = event.clientX
    drag.current.lastY = event.clientY
    onChange(next)
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null
  }

  function handleZoom(value: number[]) {
    onChange(clamped({ ...cover, scale: value[0] }))
  }

  // rotate the image BEFORE touching any state: src swap, rotation and framing reset then
  // land in one batched render — resetting first showed an unzoom, then the turn, as two steps
  async function handleRotate() {
    const next = (turns + 1) % 4
    const rotated = next === 0 ? src : await rotateToJpegDataUrl(src, next)
    // pre-decode so the swap paints instantly and CoverImage can measure the fit before paint
    const preload = new Image()
    preload.src = rotated
    await preload.decode().catch(() => {})
    setRotatedSrc(next === 0 ? null : rotated)
    onRotate()
    onChange({ ...cover, scale: 1, x: 0, y: 0 })
  }

  return (
    <div>
      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="relative aspect-[1.586] cursor-grab touch-none overflow-hidden rounded-2xl bg-muted active:cursor-grabbing"
      >
        <CoverImage cover={cover} src={turns === 0 ? src : (rotatedSrc ?? src)} imgRef={imgRef} />
        <button
          aria-label="Rotate photo"
          onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) => event.stopPropagation()}
          onClick={() => void handleRotate()}
          className={`${pressable} absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full bg-black/40 text-white`}
        >
          <RotateCwIcon className="size-4" />
        </button>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">Zoom</span>
        <Slider min={1} max={3} step={0.01} value={[cover.scale]} onValueChange={handleZoom} aria-label="Zoom" />
      </div>
      <p className="mt-1 text-center text-xs font-medium text-muted-foreground/80">Drag the photo to position it</p>
    </div>
  )
}
