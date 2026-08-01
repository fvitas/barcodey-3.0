import { HomeIcon, LayoutGridIcon, PlusIcon, Rows3Icon, SearchIcon, SettingsIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { CardDrawer } from '@/components/CardDrawer'
import { CardTile } from '@/components/CardTile'
import { mockCards, type LoyaltyCard } from '@/lib/cards'

type ViewMode = 'list' | 'grid'

export function WarmWallet() {
  const [view, setView] = useState<ViewMode>('list')
  const [query, setQuery] = useState('')
  const [activeCard, setActiveCard] = useState<LoyaltyCard | null>(null)

  const visibleCards = mockCards.filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase()))

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem] bg-stone-100 shadow-2xl shadow-stone-400/30">
      <header className="px-5 pt-8 pb-5">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Barcodey<span className="text-blue-600">.</span>
          </h1>

          <button
            onClick={() => setView(view === 'list' ? 'grid' : 'list')}
            className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"
            aria-label="Toggle view"
          >
            {view === 'list' ? <LayoutGridIcon className="size-5" /> : <Rows3Icon className="size-5" />}
          </button>
        </div>

        <div className="flex items-center gap-2.5 rounded-full bg-white px-4 py-3 shadow-sm">
          <SearchIcon className="size-4.5 shrink-0 text-stone-400" />
          <input
            value={query}
            placeholder="Search cards"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-stone-400"
            onChange={handleQueryChange}
          />
        </div>
      </header>

      <main className="px-5 pb-36">
        <motion.div
          layout
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          className={view === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-4'}
        >
          <AnimatePresence mode="popLayout">
            {visibleCards.map(card => (
              <CardTile key={card.id} card={card} view={view} onOpen={setActiveCard} />
            ))}
          </AnimatePresence>
        </motion.div>

        {visibleCards.length === 0 && (
          <p className="mt-16 text-center text-sm font-medium text-stone-400">No cards match “{query}”</p>
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-5 z-30 mx-auto flex w-fit items-center gap-10 rounded-full bg-white/90 py-3 pr-9 pl-10 shadow-xl shadow-stone-900/10 backdrop-blur">
        <button aria-label="Home" className="text-blue-600">
          <HomeIcon className="size-6" />
        </button>

        <button
          aria-label="Add card"
          className="flex size-13 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30"
        >
          <PlusIcon className="size-6" />
        </button>

        <button aria-label="Settings" className="text-stone-400">
          <SettingsIcon className="size-6" />
        </button>
      </nav>

      <CardDrawer card={activeCard} onClose={() => setActiveCard(null)} />
    </div>
  )
}
