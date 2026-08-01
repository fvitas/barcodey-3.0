import {
  ArrowDownAZIcon,
  ArrowUpAZIcon,
  CalendarArrowDownIcon,
  CalendarArrowUpIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  GripVerticalIcon,
  LayoutGridIcon,
  PencilIcon,
  PlusIcon,
  Rows3Icon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react'
import { useState } from 'react'
import { Drawer } from 'vaul'
import { renderBarcodeSvg } from '@/lib/barcode'
import {
  cardThemeGradients,
  formatAddedAt,
  mockCards,
  type BarcodeFormat,
  type CardTheme,
  type LoyaltyCard,
} from '@/lib/cards'

type ViewMode = 'list' | 'grid'
type SortMode = 'manual' | 'az' | 'za' | 'newest' | 'oldest'

const formatLabels = { ean13: 'EAN-13', code128: 'CODE 128', qrcode: 'QR' }
const allThemes = Object.keys(cardThemeGradients) as CardTheme[]
const allFormats = Object.keys(formatLabels) as BarcodeFormat[]

const sortModes: { id: SortMode; label: string; Icon: typeof GripVerticalIcon }[] = [
  { id: 'manual', label: 'Custom', Icon: GripVerticalIcon },
  { id: 'az', label: 'A to Z', Icon: ArrowDownAZIcon },
  { id: 'za', label: 'Z to A', Icon: ArrowUpAZIcon },
  { id: 'newest', label: 'Newest', Icon: CalendarArrowDownIcon },
  { id: 'oldest', label: 'Oldest', Icon: CalendarArrowUpIcon },
]

const sortComparators: Record<Exclude<SortMode, 'manual'>, (a: LoyaltyCard, b: LoyaltyCard) => number> = {
  az: (a, b) => a.name.localeCompare(b.name),
  za: (a, b) => b.name.localeCompare(a.name),
  newest: (a, b) => b.addedAt.localeCompare(a.addedAt),
  oldest: (a, b) => a.addedAt.localeCompare(b.addedAt),
}

type WallPassProps = {
  card: LoyaltyCard
  active: boolean
  view: ViewMode
  draggable: boolean
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}

function WallPass({
  card,
  active,
  view,
  draggable,
  onToggle,
  onEdit,
  onDelete,
  onToggleFavorite,
}: WallPassProps) {
  const dragControls = useDragControls()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const gridTile = view === 'grid' && !active

  return (
    <Reorder.Item
      value={card}
      dragListener={false}
      dragControls={dragControls}
      layout
      exit={{ opacity: 0, scale: 0.9 }}
      whileDrag={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      className={`relative overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-900/10 ${
        view === 'grid' && active ? 'col-span-2' : ''
      }`}
    >
      {gridTile ? (
        <button
          onClick={() => onToggle(card.id)}
          className={`relative flex aspect-[1.35] w-full flex-col justify-between p-4 text-left ${cardThemeGradients[card.theme]}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />

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
        <div className={`relative flex w-full items-center gap-1 p-4 ${cardThemeGradients[card.theme]}`}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />

          {draggable && (
            <span
              onPointerDown={event => dragControls.start(event)}
              className="relative -ml-2 cursor-grab touch-none p-1.5 text-white/50 active:cursor-grabbing"
              aria-label="Drag to reorder"
            >
              <GripVerticalIcon className="size-5" />
            </span>
          )}

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
        </div>
      )}

      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          >
            <div className="relative">
              <div className="absolute -top-3 -left-3 size-6 rounded-full bg-slate-100" />
              <div className="absolute -top-3 -right-3 size-6 rounded-full bg-slate-100" />
              <div className="mx-5 border-t-2 border-dashed border-slate-200" />
            </div>

            <div className="flex flex-col gap-2.5 p-5 pb-4">
              <div
                className={
                  card.format === 'qrcode'
                    ? 'flex justify-center [&_svg]:h-auto [&_svg]:w-40'
                    : '[&_svg]:h-auto [&_svg]:w-full'
                }
                dangerouslySetInnerHTML={{ __html: renderBarcodeSvg(card.value, card.format) }}
              />
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
                onClick={() => (confirmingDelete ? onDelete(card.id) : setConfirmingDelete(true))}
                onBlur={() => setConfirmingDelete(false)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
                  confirmingDelete ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'
                }`}
              >
                <Trash2Icon className="size-4" />
                {confirmingDelete ? 'Sure?' : 'Remove'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  )
}

type EditDrawerProps = {
  card: LoyaltyCard | null
  onClose: () => void
  onChange: (id: string, patch: Partial<LoyaltyCard>) => void
}

function EditDrawer({ card, onClose, onChange }: EditDrawerProps) {
  return (
    <Drawer.Root open={card !== null} onOpenChange={open => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
          {card && (
            <div className="px-5 pt-3 pb-8">
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
              <Drawer.Title className="mb-5 text-lg font-extrabold text-slate-900">Edit card</Drawer.Title>

              <label className="mb-5 block">
                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Name
                </span>
                <input
                  value={card.name}
                  className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  onChange={event => onChange(card.id, { name: event.target.value })}
                />
              </label>

              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Color
              </span>
              <div className="mb-6 flex gap-2.5">
                {allThemes.map(theme => (
                  <button
                    key={theme}
                    aria-label={theme}
                    onClick={() => onChange(card.id, { theme })}
                    className={`size-9 rounded-full ${cardThemeGradients[theme]} ${
                      theme === card.theme ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                    }`}
                  />
                ))}
              </div>

              <div className="mb-6 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  {formatLabels[card.format]}
                </p>
                <p className="mt-0.5 font-mono text-sm font-medium tracking-widest text-slate-600">
                  {card.value}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Done
              </button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

type AddDrawerProps = {
  open: boolean
  onClose: () => void
  onAdd: (card: LoyaltyCard) => void
}

function AddDrawer({ open, onClose, onAdd }: AddDrawerProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [scanned, setScanned] = useState(false)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [format, setFormat] = useState<BarcodeFormat>('code128')
  const [theme, setTheme] = useState<CardTheme>('ocean')

  const detectedValue = 'BC-2049-SIM-88'
  const canSubmit = name.trim() !== '' && (mode === 'scan' ? scanned : value.trim() !== '')

  function reset() {
    setMode('scan')
    setScanned(false)
    setName('')
    setValue('')
    setFormat('code128')
    setTheme('ocean')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      value: mode === 'scan' ? detectedValue : value.trim(),
      format: mode === 'scan' ? 'code128' : format,
      theme,
      favorite: false,
      addedAt: new Date().toISOString().slice(0, 10),
    })
    handleClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
            <Drawer.Title className="mb-4 text-lg font-extrabold text-slate-900">Add card</Drawer.Title>

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(['scan', 'manual'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setMode(option)}
                  className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                    mode === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {option === 'scan' ? 'Scan' : 'Manual'}
                </button>
              ))}
            </div>

            {mode === 'scan' && !scanned && (
              <div className="mb-5">
                <div className="relative mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-slate-900">
                  <div className="absolute inset-8 rounded-xl border-2 border-white/60" />
                  <CameraIcon className="size-8 text-white/30" />
                  <p className="absolute bottom-3 text-xs font-medium text-white/50">
                    Camera preview — native scanner in the real app
                  </p>
                </div>

                <button
                  onClick={() => setScanned(true)}
                  className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white"
                >
                  Simulate scan
                </button>
              </div>
            )}

            {mode === 'scan' && scanned && (
              <div className="mb-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-emerald-600 uppercase">
                    Detected · CODE 128
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-medium tracking-widest text-slate-700">
                    {detectedValue}
                  </p>
                </div>
                <button onClick={() => setScanned(false)} className="text-xs font-semibold text-emerald-700">
                  Rescan
                </button>
              </div>
            )}

            {mode === 'manual' && (
              <>
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Card number
                  </span>
                  <input
                    value={value}
                    placeholder="Type or paste the number"
                    className="w-full rounded-xl bg-slate-100 px-4 py-3 font-mono text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                    onChange={event => setValue(event.target.value)}
                  />
                </label>

                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Format
                </span>
                <div className="mb-4 flex gap-2">
                  {allFormats.map(option => (
                    <button
                      key={option}
                      onClick={() => setFormat(option)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                        format === option ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {formatLabels[option]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(mode === 'manual' || scanned) && (
              <>
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Name
                  </span>
                  <input
                    value={name}
                    placeholder="e.g. Lidl Plus"
                    className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                    onChange={event => setName(event.target.value)}
                  />
                </label>

                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Color
                </span>
                <div className="mb-6 flex gap-2.5">
                  {allThemes.map(option => (
                    <button
                      key={option}
                      aria-label={option}
                      onClick={() => setTheme(option)}
                      className={`size-9 rounded-full ${cardThemeGradients[option]} ${
                        option === theme ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              Add card
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

type SettingsDrawerProps = {
  open: boolean
  view: ViewMode
  onViewChange: (view: ViewMode) => void
  onClose: () => void
}

function SettingsDrawer({ open, view, onViewChange, onClose }: SettingsDrawerProps) {
  const [appearance, setAppearance] = useState('system')

  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-slate-900">Settings</Drawer.Title>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Appearance
            </span>
            <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {['light', 'dark', 'system'].map(option => (
                <button
                  key={option}
                  onClick={() => setAppearance(option)}
                  className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                    appearance === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Default view
            </span>
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(['list', 'grid'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => onViewChange(option)}
                  className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                    view === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Backup
            </span>
            <div className="mb-6 grid grid-cols-2 gap-2">
              <button className="rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700">
                Export cards
              </button>
              <button className="rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700">
                Import backup
              </button>
            </div>

            <p className="text-center text-xs font-medium text-slate-400">Barcodey 3.0 · mockup build</p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

type TicketWallProps = {
  initialCards?: LoyaltyCard[]
}

export function TicketWall({ initialCards = mockCards }: TicketWallProps) {
  const [cards, setCards] = useState(initialCards)
  const [view, setView] = useState<ViewMode>('list')
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const searching = query.trim().length > 0
  const draggable = sortMode === 'manual' && !searching && view === 'list'

  const filteredCards = cards.filter(card => card.name.toLowerCase().includes(query.trim().toLowerCase()))
  const sortedCards =
    sortMode === 'manual' ? filteredCards : [...filteredCards].sort(sortComparators[sortMode])
  // favorites pin to top within any sort; Array.sort is stable so relative order survives
  const visibleCards = [...sortedCards].sort((a, b) => Number(b.favorite) - Number(a.favorite))

  const editingCard = cards.find(card => card.id === editingId) ?? null
  const currentSort = sortModes.find(mode => mode.id === sortMode) ?? sortModes[0]

  function handleQueryChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
  }

  function handleToggle(id: string) {
    setActiveId(current => (current === id ? null : id))
  }

  function handleReorder(reordered: LoyaltyCard[]) {
    if (draggable) {
      setCards(reordered)
    }
  }

  function handleDelete(id: string) {
    setCards(current => current.filter(card => card.id !== id))
  }

  function handleToggleFavorite(id: string) {
    setCards(current => current.map(card => (card.id === id ? { ...card, favorite: !card.favorite } : card)))
  }

  function handleChange(id: string, patch: Partial<LoyaltyCard>) {
    setCards(current => current.map(card => (card.id === id ? { ...card, ...patch } : card)))
  }

  function handleAdd(card: LoyaltyCard) {
    setCards(current => [card, ...current])
    setActiveId(card.id)
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem] bg-slate-100">
      <header className="px-5 pt-8 pb-4">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Barcodey<span className="text-blue-600">.</span>
          </h1>

          <div className="flex gap-2">
            <button
              onClick={() => setView(view === 'list' ? 'grid' : 'list')}
              className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"
              aria-label="Toggle view"
            >
              {view === 'list' ? <LayoutGridIcon className="size-5" /> : <Rows3Icon className="size-5" />}
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
                        setSortMode(mode.id)
                        setSortOpen(false)
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                        sortMode === mode.id ? 'bg-slate-100 text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      <mode.Icon className="size-4" />
                      {mode.label}
                      {sortMode === mode.id && <CheckIcon className="ml-auto size-4 text-blue-600" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="px-5 pb-32">
        <Reorder.Group
          axis="y"
          values={visibleCards}
          onReorder={handleReorder}
          className={view === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}
        >
          <AnimatePresence initial={false}>
            {visibleCards.map(card => (
              <WallPass
                key={card.id}
                card={card}
                active={card.id === activeId}
                view={view}
                draggable={draggable}
                onToggle={handleToggle}
                onEdit={setEditingId}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {visibleCards.length === 0 && searching && (
          <p className="mt-16 text-center text-sm font-medium text-slate-400">No cards match “{query}”</p>
        )}

        {cards.length === 0 && !searching && (
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
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30"
            >
              <CameraIcon className="size-4.5" />
              Scan your first card
            </button>
          </div>
        )}
      </main>

      <button
        onClick={() => setAddOpen(true)}
        aria-label="Add card"
        className="fixed right-5 bottom-6 z-30 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30"
      >
        <PlusIcon className="size-6" />
      </button>

      <EditDrawer card={editingCard} onClose={() => setEditingId(null)} onChange={handleChange} />
      <AddDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
      <SettingsDrawer
        open={settingsOpen}
        view={view}
        onViewChange={setView}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
