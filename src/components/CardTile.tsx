import { StarIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { cardThemeGradients, type LoyaltyCard } from '@/lib/cards'

type CardTileProps = {
  card: LoyaltyCard
  view: 'list' | 'grid'
  onOpen: (card: LoyaltyCard) => void
}

const entranceVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
}

export function CardTile({ card, view, onOpen }: CardTileProps) {
  const isList = view === 'list'

  return (
    <motion.button
      layout
      layoutId={card.id}
      variants={entranceVariants}
      exit={{ opacity: 0, scale: 0.9 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      onClick={() => onOpen(card)}
      className={`relative block w-full overflow-hidden text-left shadow-lg shadow-stone-900/10 ${
        isList ? 'aspect-[1.586] rounded-3xl p-5' : 'aspect-[1.586] rounded-2xl p-3.5'
      } ${cardThemeGradients[card.theme]}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.07)_38%,transparent_39%)]" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/25 ring-inset" />

      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span
            className={`flex items-center justify-center rounded-full bg-white/25 font-bold text-white ${
              isList ? 'size-10 text-lg' : 'size-7 text-xs'
            }`}
          >
            {card.name.charAt(0).toUpperCase()}
          </span>

          {card.favorite && (
            <StarIcon className={`fill-amber-300 stroke-none ${isList ? 'size-5' : 'size-4'}`} />
          )}
        </div>

        <div>
          <p className={`font-extrabold text-white ${isList ? 'text-2xl' : 'text-sm'}`}>{card.name}</p>
          <p className={`font-medium tracking-widest text-white/60 ${isList ? 'text-sm' : 'text-[0.625rem]'}`}>
            •••• {card.value.slice(-4)}
          </p>
        </div>
      </div>
    </motion.button>
  )
}
