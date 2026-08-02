import { CalendarIcon, ChevronDownIcon, HashIcon, IdCardIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { CoverImage } from '@/components/CoverAdjust'
import { usePhotoSrc } from '@/components/PhotoField'
import { PhotoViewer } from '@/components/WallPass'
import { renderBarcodeSvg } from '@/lib/barcode'
import { formatAddedAt, formatExpiry, formatLabels, squareFormats, type Doc, type PhotoSide } from '@/lib/model'
import { pressable } from '@/lib/utils'

export const docFaceGradient = 'bg-gradient-to-br from-slate-800 to-slate-950'

type DocPhotoProps = {
  side: PhotoSide
  path: string
  onOpen: (path: string) => void
}

// documents are photos-first: full-width photo, unlike the half-width card thumbs
function DocPhoto({ side, path, onOpen }: DocPhotoProps) {
  const src = usePhotoSrc(path)

  return (
    <button
      onClick={() => onOpen(path)}
      aria-label={`View ${side} photo`}
      className="relative aspect-[1.586] w-full overflow-hidden rounded-xl"
    >
      {src !== null ? (
        <img src={src} alt={`${side} photo`} className="size-full object-cover" />
      ) : (
        <div className="size-full bg-muted" />
      )}
      <span className="absolute bottom-1.5 left-2 text-[0.5625rem] font-bold tracking-widest text-white uppercase drop-shadow">
        {side}
      </span>
    </button>
  )
}

type DocPassProps = {
  doc: Doc
  active: boolean
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function DocPass({ doc, active, onToggle, onEdit, onDelete }: DocPassProps) {
  const [viewerPath, setViewerPath] = useState<string | null>(null)
  const photoPaths = (['front', 'back'] as const).filter(side => doc.photos[side] !== undefined)
  // the face defaults to the first available photo; an explicit cover picks side + framing
  const faceSide = doc.cover?.side ?? photoPaths[0]
  const faceCover = doc.cover ?? (faceSide !== undefined ? { side: faceSide, scale: 1, x: 0, y: 0 } : undefined)
  const faceSrc = usePhotoSrc(faceSide !== undefined ? doc.photos[faceSide] : undefined)
  const photoFace = faceCover !== undefined && faceSrc !== null
  const barcodeSvg = active && doc.barcode !== undefined ? renderBarcodeSvg(doc.barcode.value, doc.barcode.format) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      className="relative rounded-2xl bg-card shadow-md shadow-slate-900/10"
    >
      <div
        onClick={(event: React.MouseEvent<HTMLDivElement>) => {
          // the photo area of a cover face toggles too; buttons inside handle themselves
          if (!photoFace) return
          if (event.target instanceof Element && event.target.closest('button') !== null) return
          onToggle(doc.id)
        }}
        className={`relative flex w-full gap-1 p-4 ${photoFace ? 'aspect-[1.586] items-end' : 'items-center'} ${
          active ? 'rounded-t-2xl' : 'rounded-2xl transition-[border-radius] delay-[180ms] duration-150 ease-out'
        } ${docFaceGradient}`}
      >
        {/* cover art is clipped by an inner wrapper so the punch notches outside it survive */}
        {photoFace && faceCover !== undefined ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <CoverImage cover={faceCover} src={faceSrc} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.04)_38%,transparent_39%)]" />
        )}

        <AnimatePresence initial={false}>
          {active && (
            <>
              <motion.span
                key="notch-left"
                initial={{ scale: 0 }}
                animate={{ scale: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }}
                exit={{ scale: 0, transition: { delay: 0.18, duration: 0.15, ease: 'easeOut' } }}
                className="absolute -bottom-3 -left-3 z-10 size-6 rounded-full bg-background"
              />
              <motion.span
                key="notch-right"
                initial={{ scale: 0 }}
                animate={{ scale: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }}
                exit={{ scale: 0, transition: { delay: 0.18, duration: 0.15, ease: 'easeOut' } }}
                className="absolute -right-3 -bottom-3 z-10 size-6 rounded-full bg-background"
              />
            </>
          )}
        </AnimatePresence>

        <button
          onClick={() => onToggle(doc.id)}
          className="relative flex min-w-0 flex-1 items-center justify-between text-left"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            {!photoFace && (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                <IdCardIcon className="size-5.5" />
              </span>
            )}

            <div className="min-w-0">
              <p className="truncate text-lg leading-tight font-extrabold text-white">{doc.name}</p>
              <p className="truncate text-[0.625rem] font-semibold tracking-[0.2em] text-white/60 uppercase">
                {doc.number ?? 'Document'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 pl-2">
            <motion.span animate={{ rotate: active ? 180 : 0 }} className="text-white/70">
              <ChevronDownIcon className="size-5" />
            </motion.span>
          </div>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="overflow-hidden"
          >
            <div className="mx-5 border-t-2 border-dashed border-border" />

            {photoPaths.length > 0 && (
              <div className="flex flex-col gap-2 px-5 pt-4 pb-1">
                {photoPaths.map(side => {
                  const path = doc.photos[side]
                  return path !== undefined && <DocPhoto key={side} side={side} path={path} onOpen={setViewerPath} />
                })}
              </div>
            )}

            {doc.barcode !== undefined && (
              <div className="flex flex-col gap-2.5 px-5 pt-4 pb-1">
                {barcodeSvg !== null ? (
                  // always a white plate so barcodes stay scanner-readable in dark mode
                  <div
                    className={`rounded-md bg-white px-3 py-2 ${
                      squareFormats.has(doc.barcode.format)
                        ? 'flex justify-center [&_svg]:h-auto [&_svg]:w-40'
                        : '[&_svg]:h-auto [&_svg]:w-full'
                    }`}
                    dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                  />
                ) : (
                  <p className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-xs font-semibold text-destructive">
                    “{doc.barcode.value}” is not a valid {formatLabels[doc.barcode.format]} number
                  </p>
                )}
                <p className="text-center font-mono text-xs font-medium tracking-[0.25em] text-muted-foreground/80">
                  {doc.barcode.value}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 px-5 pt-4 pb-4 text-sm text-muted-foreground">
              {doc.number !== undefined && (
                <p className="flex items-center gap-2.5">
                  <HashIcon className="size-4 text-muted-foreground/70" />
                  <span className="font-mono tracking-wider">{doc.number}</span>
                </p>
              )}
              {doc.expiry !== undefined && (
                <p className="flex items-center gap-2.5">
                  <CalendarIcon className="size-4 text-muted-foreground/70" />
                  Expires {formatExpiry(doc.expiry)}
                </p>
              )}
              <p className="flex items-center gap-2.5">
                <CalendarIcon className="size-4 text-muted-foreground/70" />
                Added {formatAddedAt(doc.addedAt)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
              <button
                onClick={() => onEdit(doc.id)}
                className={`${pressable} flex items-center justify-center gap-2 rounded-4xl bg-muted py-2.5 text-sm font-semibold text-foreground/80 hover:text-foreground`}
              >
                <PencilIcon className="size-4" />
                Edit
              </button>

              <button
                onClick={() => onDelete(doc.id)}
                className={`${pressable} flex items-center justify-center gap-2 rounded-4xl bg-destructive py-2.5 text-sm font-semibold text-white hover:bg-destructive/80`}
              >
                <Trash2Icon className="size-4" />
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewerPath !== null && <PhotoViewer path={viewerPath} onClose={() => setViewerPath(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}
