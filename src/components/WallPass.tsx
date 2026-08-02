import { CalendarIcon, ChevronDownIcon, PencilIcon, StarIcon, Trash2Icon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { renderBarcodeSvg } from '@/lib/barcode'
import {
  cardThemeGradients,
  formatAddedAt,
  formatLabels,
  squareFormats,
  type Card,
  type ViewMode,
} from '@/lib/model'

type WallPassProps = {
  card: Card
  active: boolean
  view: ViewMode
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
  trailing,
  onToggle,
  onEdit,
  onDelete,
  onToggleFavorite,
}: WallPassProps) {
  const gridTile = view === 'grid' && !active
  const barcodeSvg = active ? renderBarcodeSvg(card.value, card.format) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      className={`relative rounded-2xl bg-white shadow-md shadow-slate-900/10 ${
        view === 'grid' && active ? 'col-span-2' : ''
      }`}
    >
      {gridTile ? (
        <button
          onClick={() => onToggle(card.id)}
          className={`relative flex aspect-[1.35] w-full flex-col justify-between rounded-2xl p-4 text-left ${cardThemeGradients[card.theme]}`}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />

          <div className="relative flex items-start justify-between">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white">
              {card.name.charAt(0).toUpperCase()}
            </span>
            {card.favorite && <StarIcon className="size-4 fill-amber-300 stroke-none" />}
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
          className={`relative flex w-full items-center gap-1 p-4 ${
            active
              ? 'rounded-t-2xl'
              : 'rounded-2xl transition-[border-radius] delay-[180ms] duration-150 ease-out'
          } ${cardThemeGradients[card.theme]}`}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />

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
                  className="absolute -bottom-3 -left-3 z-10 size-6 rounded-full bg-slate-100"
                />
                <motion.span
                  key="notch-right"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, transition: { type: 'spring', stiffness: 500, damping: 30 } }}
                  exit={{ scale: 0, transition: { delay: 0.18, duration: 0.15, ease: 'easeOut' } }}
                  className="absolute -right-3 -bottom-3 z-10 size-6 rounded-full bg-slate-100"
                />
              </>
            )}
          </AnimatePresence>

          <button
            onClick={() => onToggle(card.id)}
            className="relative flex min-w-0 flex-1 items-center justify-between text-left"
          >
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/25 text-lg font-bold text-white">
                {card.name.charAt(0).toUpperCase()}
              </span>

              <div className="min-w-0">
                <p className="truncate text-lg leading-tight font-extrabold text-white">{card.name}</p>
                <p className="text-[0.625rem] font-semibold tracking-[0.2em] text-white/60 uppercase">
                  {formatLabels[card.format]} · •••• {card.value.slice(-4)}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pl-2">
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
            <div className="mx-5 border-t-2 border-dashed border-slate-200" />

            <div className="flex flex-col gap-2.5 p-5 pb-4">
              {barcodeSvg !== null ? (
                <div
                  className={
                    squareFormats.has(card.format)
                      ? 'flex justify-center [&_svg]:h-auto [&_svg]:w-40'
                      : '[&_svg]:h-auto [&_svg]:w-full'
                  }
                  dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                />
              ) : (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-xs font-semibold text-red-600">
                  “{card.value}” is not a valid {formatLabels[card.format]} number
                </p>
              )}
              <p className="text-center font-mono text-xs font-medium tracking-[0.25em] text-slate-400">
                {card.value}
              </p>
            </div>

            <div className="flex flex-col gap-2 px-5 pb-4 text-sm text-slate-500">
              <p className="flex items-center gap-2.5">
                <CalendarIcon className="size-4 text-slate-400" />
                Added {formatAddedAt(card.addedAt)}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              <button
                onClick={() => onToggleFavorite(card.id)}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700"
              >
                <StarIcon className={`size-4 ${card.favorite ? 'fill-amber-400 stroke-none' : ''}`} />
                {card.favorite ? 'Unpin' : 'Favorite'}
              </button>

              <button
                onClick={() => onEdit(card.id)}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700"
              >
                <PencilIcon className="size-4" />
                Edit
              </button>

              <button
                onClick={() => onDelete(card.id)}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white"
              >
                <Trash2Icon className="size-4" />
                Remove
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
