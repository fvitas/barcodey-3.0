import { CalendarIcon, PencilIcon, StarIcon, SunIcon, Trash2Icon } from 'lucide-react'
import { Drawer } from 'vaul'
import { renderBarcodeSvg } from '@/lib/barcode'
import { cardThemeGradients, formatAddedAt, type LoyaltyCard } from '@/lib/cards'

type CardDrawerProps = {
  card: LoyaltyCard | null
  onClose: () => void
  appearance?: 'light' | 'dark'
}

const formatLabels = { ean13: 'EAN-13', code128: 'CODE 128', qrcode: 'QR' }

export function CardDrawer({ card, onClose, appearance = 'light' }: CardDrawerProps) {
  const dark = appearance === 'dark'

  return (
    <Drawer.Root open={card !== null} onOpenChange={open => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content
          className={`fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] outline-none ${
            dark ? 'bg-zinc-900 text-white' : 'bg-stone-50'
          }`}
        >
          {card && (
            <div className="px-5 pt-3 pb-8">
              <div className={`mx-auto mb-5 h-1.5 w-10 rounded-full ${dark ? 'bg-white/20' : 'bg-stone-300'}`} />

              <div className="mb-5 flex items-center gap-3">
                <span
                  className={`flex size-11 items-center justify-center rounded-xl font-bold text-white ${cardThemeGradients[card.theme]}`}
                >
                  {card.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <Drawer.Title className="truncate text-lg font-extrabold">{card.name}</Drawer.Title>
                  <p
                    className={`text-xs font-semibold tracking-wider uppercase ${
                      dark ? 'text-white/40' : 'text-stone-400'
                    }`}
                  >
                    {formatLabels[card.format]}
                  </p>
                </div>

                <span
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    dark ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  <SunIcon className="size-3.5" />
                  Max brightness
                </span>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div
                  className={
                    card.format === 'qrcode'
                      ? 'flex justify-center py-1 [&_svg]:h-auto [&_svg]:w-44'
                      : '[&_svg]:h-auto [&_svg]:w-full'
                  }
                  dangerouslySetInnerHTML={{ __html: renderBarcodeSvg(card.value, card.format) }}
                />
                <p className="mt-3 text-center font-mono text-sm font-medium tracking-[0.2em] text-stone-500">
                  {card.value}
                </p>
              </div>

              <div className={`mt-5 space-y-2.5 text-sm ${dark ? 'text-white/50' : 'text-stone-500'}`}>
                <p className="flex items-center gap-2.5">
                  <CalendarIcon className={`size-4 ${dark ? 'text-white/30' : 'text-stone-400'}`} />
                  Added {formatAddedAt(card.addedAt)}
                </p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2.5">
                <button
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${
                    dark ? 'bg-white/10 text-white' : 'bg-stone-200/70 text-stone-700'
                  }`}
                >
                  <PencilIcon className="size-4" />
                  Edit
                </button>
                <button
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${
                    dark ? 'bg-white/10 text-white' : 'bg-stone-200/70 text-stone-700'
                  }`}
                >
                  <StarIcon className={`size-4 ${card.favorite ? 'fill-amber-400 stroke-none' : ''}`} />
                  Favorite
                </button>
                <button
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ${
                    dark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600'
                  }`}
                >
                  <Trash2Icon className="size-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
