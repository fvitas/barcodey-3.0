import { useRef } from 'react'
import { Slider } from '@/components/ui/slider'
import type { CardCover } from '@/lib/model'

type CoverImageProps = {
  cover: CardCover
  src: string
  imgRef?: React.Ref<HTMLImageElement>
}

// scale on a wrapper + %-translate on a centered cover-fit img: the stored transform
// renders identically in any frame with the card aspect, no measurements needed
export function CoverImage({ cover, src, imgRef }: CoverImageProps) {
  return (
    <div style={{ transform: `scale(${cover.scale})` }} className="absolute inset-0">
      <img
        ref={imgRef}
        src={src}
        alt=""
        draggable={false}
        style={{ transform: `translate(calc(-50% + ${cover.x * 100}%), calc(-50% + ${cover.y * 100}%))` }}
        className="absolute top-1/2 left-1/2 min-h-full min-w-full max-w-none"
      />
    </div>
  )
}

type CoverAdjustProps = {
  src: string
  cover: CardCover
  onChange: (cover: CardCover) => void
}

export function CoverAdjust({ src, cover, onChange }: CoverAdjustProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const drag = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null)

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
        <CoverImage cover={cover} src={src} imgRef={imgRef} />
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">Zoom</span>
        <Slider min={1} max={3} step={0.01} value={[cover.scale]} onValueChange={handleZoom} aria-label="Zoom" />
      </div>
      <p className="mt-1 text-center text-xs font-medium text-muted-foreground/80">Drag the photo to position it</p>
    </div>
  )
}
