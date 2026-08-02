import {
  ArrowDownAZIcon,
  ArrowUpAZIcon,
  CalendarArrowDownIcon,
  CalendarArrowUpIcon,
  CameraIcon,
  CheckIcon,
  FlaskConicalIcon,
  GripVerticalIcon,
  LayoutGridIcon,
  Rows3Icon,
  SearchIcon,
  SettingsIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { EditDrawer } from '@/components/EditDrawer'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { WallPass } from '@/components/WallPass'
import { useBrightnessBoost } from '@/hooks/use-brightness-boost'
import { sortCards, type SortMode } from '@/lib/model'
import { createSampleCard } from '@/lib/sample-card'
import { useOpenAddDrawer } from '@/state/add-drawer-context'
import { useUiState } from '@/state/ui-state-context'
import { useWallet } from '@/state/wallet-context'

const sortModes: { id: SortMode; label: string; Icon: typeof GripVerticalIcon }[] = [
  { id: 'manual', label: 'Custom', Icon: GripVerticalIcon },
  { id: 'az', label: 'A to Z', Icon: ArrowDownAZIcon },
  { id: 'za', label: 'Z to A', Icon: ArrowUpAZIcon },
  { id: 'newest', label: 'Newest', Icon: CalendarArrowDownIcon },
  { id: 'oldest', label: 'Oldest', Icon: CalendarArrowUpIcon },
]

function EmptyState() {
  const openAddDrawer = useOpenAddDrawer()

  return (
    <div className="mt-14 flex flex-col items-center px-6 text-center">
      <div className="pointer-events-none relative mb-10">
        <div className="absolute -inset-10 rounded-full bg-blue-500/15 blur-3xl" />

        <div className="relative w-56 rounded-[1.25rem] bg-white px-6 py-7 shadow-2xl shadow-blue-900/30">
          <div className="flex justify-center gap-[3px]">
            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2].map((width, index) => (
              <div key={index} className="h-12 bg-slate-900" style={{ width: `${width}px` }} />
            ))}
          </div>

          <motion.div
            animate={{ y: [0, 44, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-x-6 top-7 h-0.5 rounded-full bg-blue-500 shadow-[0_0_10px_2px_rgba(59,130,246,0.55)]"
          />
        </div>
      </div>

      <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
        All your cards in one place
      </h2>
      <p className="mb-7 max-w-64 text-sm font-medium text-slate-500">
        Scan it once — ready at every checkout, even offline.
      </p>

      <button
        onClick={openAddDrawer}
        className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30"
      >
        <CameraIcon className="size-4.5" />
        Scan your first card
      </button>
    </div>
  )
}

export function WalletScreen() {
  const { cards, addCard, updateCard, removeCard } = useWallet()
  const { state, update } = useUiState()
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const searching = query.trim().length > 0
  const filteredCards = cards.filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase()))
  const visibleCards = sortCards(filteredCards, state.sort)

  const editingCard = cards.find(card => card.id === editingId) ?? null
  const currentSort = sortModes.find(mode => mode.id === state.sort) ?? sortModes[0]

  useBrightnessBoost(state.expandedCardId !== null)

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
  }

  function handleToggle(id: string) {
    update({ expandedCardId: state.expandedCardId === id ? null : id })
  }

  function handleDelete(id: string) {
    removeCard(id)
    if (state.expandedCardId === id) {
      update({ expandedCardId: null })
    }
  }

  function handleToggleFavorite(id: string) {
    const card = cards.find(current => current.id === id)
    if (card !== undefined) {
      updateCard(id, { favorite: !card.favorite })
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem] bg-slate-100">
      <header className="px-5 pt-8 pb-4">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Barcodey<span className="text-blue-600">.</span>
          </h1>

          <div className="flex gap-2">
            {import.meta.env.DEV && (
              <button
                onClick={() => addCard(createSampleCard())}
                className="flex size-10 items-center justify-center rounded-full bg-white text-amber-500 shadow-sm"
                aria-label="Add sample card"
              >
                <FlaskConicalIcon className="size-5" />
              </button>
            )}

            <button
              onClick={() => update({ view: state.view === 'list' ? 'grid' : 'list' })}
              className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"
              aria-label="Toggle view"
            >
              {state.view === 'list' ? <LayoutGridIcon className="size-5" /> : <Rows3Icon className="size-5" />}
            </button>

            <button
              onClick={() => setSettingsOpen(true)}
              className="flex size-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm"
              aria-label="Settings"
            >
              <SettingsIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-1.5 pl-4 shadow-sm">
            <SearchIcon className="size-4.5 shrink-0 text-slate-400" />
            <input
              value={query}
              placeholder="Search cards"
              className="w-full bg-transparent py-1.5 text-sm font-medium outline-none placeholder:text-slate-400"
              onChange={handleQueryChange}
            />

            <button
              onClick={() => setSortOpen(current => !current)}
              aria-label="Sort"
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 py-2 pr-3 pl-2.5 text-xs font-semibold text-slate-600"
            >
              <currentSort.Icon className="size-4" />
              {currentSort.label}
            </button>
          </div>

          <AnimatePresence>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 z-40 mt-2 w-44 rounded-2xl bg-white p-1.5 shadow-xl shadow-slate-900/15"
                >
                  {sortModes.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        update({ sort: mode.id })
                        setSortOpen(false)
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                        state.sort === mode.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      <mode.Icon className="size-4" />
                      {mode.label}
                      {state.sort === mode.id && <CheckIcon className="ml-auto size-4 text-blue-600" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="px-5 pb-32">
        <div className={state.view === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
          <AnimatePresence initial={false}>
            {visibleCards.map(card => (
              <WallPass
                key={card.id}
                card={card}
                active={card.id === state.expandedCardId}
                view={state.view}
                onToggle={handleToggle}
                onEdit={setEditingId}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </AnimatePresence>
        </div>

        {visibleCards.length === 0 && searching && (
          <p className="mt-16 text-center text-sm font-medium text-slate-400">No cards match “{query}”</p>
        )}

        {cards.length === 0 && !searching && <EmptyState />}
      </main>

      <EditDrawer card={editingCard} onClose={() => setEditingId(null)} onChange={updateCard} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
