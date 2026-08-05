import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDownAZIcon,
  ArrowUpAZIcon,
  CalendarArrowDownIcon,
  CalendarArrowUpIcon,
  CameraIcon,
  CheckIcon,
  FlaskConicalIcon,
  GalleryHorizontalEndIcon,
  GripVerticalIcon,
  LayoutGridIcon,
  Rows3Icon,
  SearchIcon,
  SettingsIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { DeckView } from '@/components/DeckView'
import { EditDrawer } from '@/components/EditDrawer'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { WallPass } from '@/components/WallPass'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useBrightnessBoost } from '@/hooks/use-brightness-boost'
import { sortCards, type Card, type SortMode, type ViewMode } from '@/lib/model'
import { createSampleCard } from '@/lib/sample-card'
import { pressable } from '@/lib/utils'
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

const viewOptions: { id: ViewMode; label: string; Icon: typeof Rows3Icon }[] = [
  { id: 'list', label: 'List', Icon: Rows3Icon },
  { id: 'grid', label: 'Grid', Icon: LayoutGridIcon },
  { id: 'deck', label: 'Deck', Icon: GalleryHorizontalEndIcon },
]

type SortablePassProps = {
  card: Card
  active: boolean
  view: ViewMode
  draggable: boolean
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}

function SortablePass({ card, active, view, draggable, ...passProps }: SortablePassProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !draggable,
  })

  // list drags from the grip handle; grid tiles drag as a whole (press-and-hold sensor)
  const gridDrag = draggable && view === 'grid' && !active
  const gripHandle = draggable && (view === 'list' || active) && (
    <button
      {...attributes}
      {...listeners}
      aria-label="Reorder"
      className="relative -ml-1 shrink-0 cursor-grab touch-none p-1 text-white/60 active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-5" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: gridDrag ? 'manipulation' : undefined,
      }}
      className={`${isDragging ? 'relative z-20' : ''} ${view === 'grid' && active ? 'col-span-2' : ''}`}
      {...(gridDrag ? { ...attributes, ...listeners } : {})}
    >
      <WallPass card={card} active={active} view={view} leading={gripHandle || undefined} {...passProps} />
    </div>
  )
}

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

      <h2 className="mb-1.5 text-2xl font-extrabold tracking-tight text-foreground">
        All your cards in one place
      </h2>
      <p className="mb-7 max-w-64 text-sm font-medium text-muted-foreground">
        Scan it once — ready at every checkout, even offline.
      </p>

      <button
        onClick={openAddDrawer}
        className={`${pressable} flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/80`}
      >
        <CameraIcon className="size-4.5" />
        Scan your first card
      </button>
    </div>
  )
}

export function WalletScreen() {
  const { cards, addCard, updateCard, removeCard, moveCard } = useWallet()
  const { state, update } = useUiState()
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const searching = query.trim().length > 0
  const filteredCards = cards.filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase()))
  const visibleCards = sortCards(filteredCards, state.sort)

  const editingCard = cards.find(card => card.id === editingId) ?? null
  const currentSort = sortModes.find(mode => mode.id === state.sort) ?? sortModes[0]
  const currentView = viewOptions.find(option => option.id === state.view) ?? viewOptions[0]
  const draggable = state.sort === 'manual' && !searching && state.view !== 'deck'

  // grid tiles drag as a whole, so a press-and-hold keeps taps working; the list grip needs no delay
  const listSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const gridSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )

  useBrightnessBoost(state.expandedCardId !== null)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over === null || active.id === over.id) return
    moveCard(String(active.id), String(over.id))
  }

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

  function handleDeckIndexChange(index: number) {
    update({ deckIndex: index })
  }

  function handleToggleFavorite(id: string) {
    const card = cards.find(current => current.id === id)
    if (card !== undefined) {
      updateCard(id, { favorite: !card.favorite })
    }
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[26rem] flex-col">
      <header className="shrink-0 px-5 pt-8 pb-4">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Barcodey<span className="text-primary">.</span>
          </h1>

          <div className="flex gap-2">
            {import.meta.env.DEV && (
              <button
                onClick={() => addCard(createSampleCard())}
                className={`${pressable} flex size-10 items-center justify-center rounded-full bg-card text-amber-500 shadow-sm`}
                aria-label="Add sample card"
              >
                <FlaskConicalIcon className="size-5" />
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Change view"
                  className={`${pressable} flex size-10 items-center justify-center rounded-full bg-card text-primary shadow-sm`}
                >
                  <currentView.Icon className="size-5" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={8}>
                {viewOptions.map(option => (
                  <DropdownMenuItem
                    key={option.id}
                    onSelect={() => update({ view: option.id })}
                    className="gap-2.5 font-semibold"
                  >
                    <option.Icon className="size-4" />
                    {option.label}
                    {state.view === option.id && <CheckIcon className="ml-auto size-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={() => setSettingsOpen(true)}
              className={`${pressable} flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm hover:text-foreground`}
              aria-label="Settings"
            >
              <SettingsIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-full border border-transparent bg-card py-1.5 pr-1.5 pl-4 shadow-sm transition-all focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
          <SearchIcon className="size-4.5 shrink-0 text-muted-foreground/70" />
          <input
            value={query}
            placeholder="Search cards"
            className="w-full bg-transparent py-1.5 text-sm font-medium outline-none placeholder:text-muted-foreground"
            onChange={handleQueryChange}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Sort"
                className={`${pressable} flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-2 pr-3 pl-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground`}
              >
                <currentSort.Icon className="size-4" />
                {currentSort.label}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8}>
              {sortModes.map(mode => (
                <DropdownMenuItem
                  key={mode.id}
                  onSelect={() => update({ sort: mode.id })}
                  className="gap-2.5 font-semibold"
                >
                  <mode.Icon className="size-4" />
                  {mode.label}
                  {state.sort === mode.id && <CheckIcon className="ml-auto size-4 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* deck fills the space and scrolls internally; wall views scroll here, past the floating nav */}
      <main className={`min-h-0 flex-1 px-5 ${state.view === 'deck' ? 'overflow-hidden' : 'overflow-y-auto pb-32'}`}>
        {state.view === 'deck' ? (
          <DeckView
            cards={visibleCards}
            expandedCardId={state.expandedCardId}
            resetSignal={`${state.sort}|${query.trim().toLowerCase()}`}
            initialIndex={state.deckIndex}
            onIndexChange={handleDeckIndexChange}
            onToggle={handleToggle}
            onEdit={setEditingId}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : (
          <DndContext
            sensors={state.view === 'grid' ? gridSensors : listSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={visibleCards.map(card => card.id)}
              strategy={state.view === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
            >
              <div className={state.view === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
                <AnimatePresence initial={false}>
                  {visibleCards.map(card => (
                    <SortablePass
                      key={card.id}
                      card={card}
                      active={card.id === state.expandedCardId}
                      view={state.view}
                      draggable={draggable}
                      onToggle={handleToggle}
                      onEdit={setEditingId}
                      onDelete={handleDelete}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}

        {visibleCards.length === 0 && searching && (
          <p className="mt-16 text-center text-sm font-medium text-muted-foreground">No cards match “{query}”</p>
        )}

        {cards.length === 0 && !searching && <EmptyState />}
      </main>

      <EditDrawer card={editingCard} onClose={() => setEditingId(null)} onChange={updateCard} />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
