import { CalendarIcon, ChevronDownIcon, PencilIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CoverImage } from '@/components/CoverAdjust'
import { ExpiryPill } from '@/components/ExpiryPill'
import { usePhotoSrc } from '@/components/PhotoField'
import { renderBarcodeSvg } from '@/lib/barcode'
import { expiryLongLabel } from '@/lib/expiry'
import {
  cardThemeGradients,
  formatAddedAt,
  formatLabels,
  squareFormats,
  type Card,
  type PhotoSide,
  type ViewMode,
} from '@/lib/model'
import { pressable } from '@/lib/utils'

type PassPhotoProps = {
  side: PhotoSide
  path: string
  onOpen: (path: string) => void
}

function PassPhoto({ side, path, onOpen }: PassPhotoProps) {
  const src = usePhotoSrc(path)

  return (
    <button
      onClick={() => onOpen(path)}
      aria-label={`View ${side} photo`}
      className="relative aspect-[1.6] w-[calc(50%-0.25rem)] overflow-hidden rounded-lg"
    >
      {src !== null ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <div className="size-full bg-muted" />
      )}
      <span className="absolute bottom-1 left-1.5 text-[0.5625rem] font-bold tracking-widest text-white uppercase drop-shadow">
        {side}
      </span>
    </button>
  )
}

export function PhotoViewer({ path, onClose }: { path: string; onClose: () => void }) {
  const src = usePhotoSrc(path)

  return createPortal(
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      aria-label="Close photo"
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/90 p-4"
    >
      {src !== null && <img src={src} alt="" className="max-h-full max-w-full rounded-xl" />}
    </motion.button>,
    document.body,
  )
}

type PassDetailsProps = {
  card: Card
  stretch?: boolean // deck open card: the barcode grows into the free space
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}

// the unfolded half of a pass — shared by the wall (list/grid) and the deck so the views never drift
export function PassDetails({ card, stretch = false, onEdit, onDelete, onToggleFavorite }: PassDetailsProps) {
  const square = squareFormats.has(card.format)
  // stable object identity: react 19 re-sets innerHTML (remounting the svg) whenever
  // dangerouslySetInnerHTML receives a new object, even with an identical string
  const plateHtml = useMemo(() => {
    const svg = renderBarcodeSvg(card.value, card.format)
    if (svg === null) return null
    // taller 1D bars scan better and the x-scale stays proportional, so non-uniform stretch is safe
    return { __html: stretch && !square ? svg.replace('<svg', '<svg preserveAspectRatio="none"') : svg }
  }, [card.value, card.format, stretch, square])
  const [viewerPath, setViewerPath] = useState<string | null>(null)
  const photoPaths = (['front', 'back'] as const).filter(side => card.photos[side] !== undefined)

  return (
    <>
      <div className="mx-5 border-t-2 border-dashed border-border" />

      <div className={`flex flex-col gap-2.5 p-5 pb-4 ${stretch && plateHtml !== null ? 'min-h-0 flex-1 justify-center' : ''}`}>
        {plateHtml !== null ? (
          // always a white plate so barcodes stay scanner-readable in dark mode
          <div
            className={`rounded-md bg-white px-3 py-2 ${
              square
                ? `flex justify-center ${stretch ? 'min-h-0 flex-1 [&_svg]:h-full [&_svg]:max-w-full' : '[&_svg]:h-auto [&_svg]:w-40'}`
                : stretch
                  ? 'max-h-48 min-h-24 flex-1 [&_svg]:h-full [&_svg]:w-full' // capped so bars stay believable
                  : '[&_svg]:h-auto [&_svg]:max-h-24 [&_svg]:w-full' // squat symbologies (EAN-8) balloon at full width
            }`}
            dangerouslySetInnerHTML={plateHtml}
          />
        ) : (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-center text-xs font-semibold text-destructive">
            “{card.value}” is not a valid {formatLabels[card.format]} number
          </p>
        )}
        <p className="text-center font-mono text-xs font-medium tracking-[0.25em] text-muted-foreground/80">
          {card.value}
        </p>
      </div>

      <AnimatePresence initial={false}>
        {photoPaths.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 px-5 pb-4">
              {photoPaths.map(side => {
                const path = card.photos[side]
                return path !== undefined && <PassPhoto key={side} side={side} path={path} onOpen={setViewerPath} />
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2 px-5 pb-4 text-sm text-muted-foreground">
        {card.expiry !== undefined && (
          <p className="flex items-center gap-2.5">
            <CalendarIcon className="size-4 text-muted-foreground/70" />
            {expiryLongLabel(card.expiry, new Date())}
          </p>
        )}
        <p className="flex items-center gap-2.5">
          <CalendarIcon className="size-4 text-muted-foreground/70" />
          Added {formatAddedAt(card.addedAt)}
        </p>
      </div>

      {/* mt-auto pins the actions to the bottom of the deck's stretched card; inert in block flow */}
      <div className="mt-auto grid grid-cols-3 gap-2 px-4 pb-4">
        <button
          onClick={() => onToggleFavorite(card.id)}
          className={`${pressable} flex items-center justify-center gap-2 rounded-4xl bg-muted py-2.5 text-sm font-semibold text-foreground/80 hover:text-foreground`}
        >
          <StarIcon className={`size-4 ${card.favorite ? 'fill-amber-400 stroke-none' : ''}`} />
          {card.favorite ? 'Unpin' : 'Favorite'}
        </button>

        <button
          onClick={() => onEdit(card.id)}
          className={`${pressable} flex items-center justify-center gap-2 rounded-4xl bg-muted py-2.5 text-sm font-semibold text-foreground/80 hover:text-foreground`}
        >
          <PencilIcon className="size-4" />
          Edit
        </button>

        <button
          onClick={() => onDelete(card.id)}
          className={`${pressable} flex items-center justify-center gap-2 rounded-4xl bg-destructive py-2.5 text-sm font-semibold text-white hover:bg-destructive/80`}
        >
          <Trash2Icon className="size-4" />
          Remove
        </button>
      </div>

      <AnimatePresence>
        {viewerPath !== null && <PhotoViewer path={viewerPath} onClose={() => setViewerPath(null)} />}
      </AnimatePresence>
    </>
  )
}

type WallPassProps = {
  card: Card
  active: boolean
  view: ViewMode
  leading?: React.ReactNode
  trailing?: React.ReactNode
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}

export function WallPass({
  card,
  active,
  view,
  leading,
  trailing,
  onToggle,
  onEdit,
  onDelete,
  onToggleFavorite,
}: WallPassProps) {
  const gridTile = view === 'grid' && !active
  const coverSrc = usePhotoSrc(card.cover !== undefined ? card.photos[card.cover.side] : undefined)
  const photoFace = card.cover !== undefined && coverSrc !== null

  return (
    <motion.div
      // full `layout` re-resolves the details' height-auto animation from 0 on re-sorts (unpin)
      layout="position"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      className={`relative rounded-2xl bg-card shadow-md shadow-slate-900/10 ${
        view === 'grid' && active ? 'col-span-2' : ''
      }`}
    >
      {gridTile ? (
        <button
          onClick={() => onToggle(card.id)}
          className={`relative flex aspect-[1.586] w-full flex-col justify-between rounded-2xl p-4 text-left ${cardThemeGradients[card.theme]}`}
        >
          {photoFace && card.cover !== undefined ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <CoverImage cover={card.cover} src={coverSrc} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />
          )}

          <div className="relative flex items-start justify-between">
            {photoFace ? (
              <span />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white">
                {card.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <ExpiryPill expiry={card.expiry} variant="disc" />
              {card.favorite && <StarIcon className="size-4 fill-amber-300 stroke-none" />}
            </span>
          </div>

          <div className="relative">
            <p className="truncate text-base leading-tight font-extrabold text-white">{card.name}</p>
            <p className="text-[0.5625rem] font-semibold tracking-[0.2em] text-white/60 uppercase">
              {formatLabels[card.format]} · •••• {card.value.slice(-4)}
            </p>
          </div>
        </button>
      ) : (
        <div
          onClick={(event: React.MouseEvent<HTMLDivElement>) => {
            // the photo area of a cover face toggles too; buttons inside handle themselves
            if (!photoFace) return
            if (event.target instanceof Element && event.target.closest('button') !== null) return
            onToggle(card.id)
          }}
          className={`relative flex w-full gap-1 p-4 ${photoFace ? 'aspect-[1.586] items-end' : 'items-center'} ${
            active
              ? 'rounded-t-2xl'
              : 'rounded-2xl transition-[border-radius] delay-[180ms] duration-150 ease-out'
          } ${cardThemeGradients[card.theme]}`}
        >
          {/* cover art is clipped by an inner wrapper so the punch notches outside it survive */}
          {photoFace && card.cover !== undefined ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
              <CoverImage cover={card.cover} src={coverSrc} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />
          )}

          {/* punch holes sit on the divider and extend past the card edge so they cut the drop shadow too;
              on close they stay through the fold-up, then shrink as the corners round off */}
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

          {leading}

          <button
            onClick={() => onToggle(card.id)}
            className="relative flex min-w-0 flex-1 items-center justify-between text-left"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              {!photoFace && (
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/25 text-lg font-bold text-white">
                  {card.name.charAt(0).toUpperCase()}
                </span>
              )}

              <div className="min-w-0">
                <p className="truncate text-lg leading-tight font-extrabold text-white">{card.name}</p>
                <p className="text-[0.625rem] font-semibold tracking-[0.2em] text-white/60 uppercase">
                  {formatLabels[card.format]} · •••• {card.value.slice(-4)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pl-2">
              <ExpiryPill expiry={card.expiry} />
              {card.favorite && <StarIcon className="size-4.5 fill-amber-300 stroke-none" />}
              <motion.span animate={{ rotate: active ? 180 : 0 }} className="text-white/70">
                <ChevronDownIcon className="size-5" />
              </motion.span>
            </div>
          </button>

          {trailing}
        </div>
      )}

      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
            className="overflow-hidden"
          >
            <PassDetails card={card} onEdit={onEdit} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
