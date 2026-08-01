import {
  IdCardIcon,
  LayoutGridIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ScanFaceIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Drawer } from 'vaul'
import { cardThemeGradients, mockCards, type LoyaltyCard } from '@/lib/cards'

const formatLabels = { ean13: 'EAN-13', code128: 'CODE 128', qrcode: 'QR' }

type Folder = { id: string; name: string; cardIds: string[] }

const initialFolders: Folder[] = [
  { id: 'groceries', name: 'Groceries', cardIds: ['lidl', 'maxi', 'dm'] },
  { id: 'home', name: 'Home & Furniture', cardIds: ['ikea', 'idea'] },
  { id: 'sport', name: 'Sport', cardIds: ['decathlon'] },
]

const mockDocuments = [
  { id: 'id-card', name: 'ID Card', hint: 'Expires Mar 2029' },
  { id: 'licence', name: 'Driving Licence', hint: 'Expires Nov 2027' },
]

function Pass({ card }: { card: LoyaltyCard }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className={`relative flex items-center gap-3.5 overflow-hidden rounded-2xl p-4 shadow-md shadow-slate-900/10 ${cardThemeGradients[card.theme]}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />

      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-white/25 text-lg font-bold text-white">
        {card.name.charAt(0).toUpperCase()}
      </span>

      <div className="relative min-w-0 flex-1">
        <p className="truncate text-lg leading-tight font-extrabold text-white">{card.name}</p>
        <p className="text-[0.625rem] font-semibold tracking-[0.2em] text-white/60 uppercase">
          {formatLabels[card.format]} · •••• {card.value.slice(-4)}
        </p>
      </div>

      {card.favorite && <StarIcon className="relative size-4.5 shrink-0 fill-amber-300 stroke-none" />}
    </motion.div>
  )
}

export function FoldersChips() {
  const [folders, setFolders] = useState(initialFolders)
  const [activeChip, setActiveChip] = useState<'all' | 'documents' | string>('all')
  const [documentsLocked, setDocumentsLocked] = useState(true)
  const [manageOpen, setManageOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const activeFolder = folders.find(folder => folder.id === activeChip) ?? null
  const visibleCards =
    activeFolder === null ? mockCards : mockCards.filter(card => activeFolder.cardIds.includes(card.id))

  function handleCreateFolder() {
    const name = newFolderName.trim()
    if (name === '') return
    setFolders(current => [...current, { id: crypto.randomUUID(), name, cardIds: [] }])
    setNewFolderName('')
  }

  function handleDeleteFolder(id: string) {
    setFolders(current => current.filter(folder => folder.id !== id))
    if (activeChip === id) {
      setActiveChip('all')
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem] bg-slate-100 pb-28">
      <header className="pt-8 pb-4">
        <div className="mb-5 flex items-center justify-between px-5">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Barcodey<span className="text-blue-600">.</span>
          </h1>

          <div className="flex gap-2">
            <button
              className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"
              aria-label="Toggle view"
            >
              <LayoutGridIcon className="size-5" />
            </button>
            <button
              className="flex size-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm"
              aria-label="Settings"
            >
              <SettingsIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="mb-4 px-5">
          <div className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-1.5 pl-4 shadow-sm">
            <SearchIcon className="size-4.5 shrink-0 text-slate-400" />
            <input
              placeholder="Search cards"
              className="w-full bg-transparent py-1.5 text-sm font-medium outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          <button
            onClick={() => setActiveChip('all')}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
              activeChip === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'
            }`}
          >
            All
          </button>

          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setActiveChip(folder.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                activeChip === folder.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'
              }`}
            >
              {folder.name}
              <span className={activeChip === folder.id ? 'ml-1.5 text-white/50' : 'ml-1.5 text-slate-400'}>
                {folder.cardIds.length}
              </span>
            </button>
          ))}

          <button
            onClick={() => setActiveChip('documents')}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${
              activeChip === 'documents' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-sm'
            }`}
          >
            <LockIcon className="size-3" />
            Documents
          </button>

          <button
            onClick={() => setManageOpen(true)}
            aria-label="Manage folders"
            className="flex shrink-0 items-center justify-center rounded-full bg-white px-3 py-2 text-slate-400 shadow-sm"
          >
            <PencilIcon className="size-3.5" />
          </button>
        </div>
      </header>

      <main className="px-5">
        {activeChip !== 'documents' && (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {visibleCards.map(card => (
                <Pass key={card.id} card={card} />
              ))}
            </AnimatePresence>

            {visibleCards.length === 0 && (
              <p className="mt-16 text-center text-sm font-medium text-slate-400">
                No cards in this folder yet
              </p>
            )}
          </div>
        )}

        {activeChip === 'documents' &&
          (documentsLocked ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-slate-900 text-white">
                <ScanFaceIcon className="size-8" />
              </span>
              <h2 className="mb-1 text-lg font-extrabold text-slate-900">Documents are locked</h2>
              <p className="mb-6 text-sm font-medium text-slate-500">IDs and licences stay behind Face ID</p>
              <button
                onClick={() => setDocumentsLocked(false)}
                className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30"
              >
                Unlock with Face ID
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {mockDocuments.map(document => (
                <div key={document.id} className="rounded-2xl bg-white p-3 shadow-sm">
                  <div className="mb-3 flex aspect-[1.586] items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-400">
                    <IdCardIcon className="size-8 text-white" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">{document.name}</p>
                  <p className="text-xs font-medium text-slate-400">{document.hint}</p>
                </div>
              ))}
            </div>
          ))}
      </main>

      <button
        aria-label="Add card"
        className="fixed right-5 bottom-6 z-30 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30"
      >
        <PlusIcon className="size-6" />
      </button>

      <Drawer.Root open={manageOpen} onOpenChange={open => !open && setManageOpen(false)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
            <div className="px-5 pt-3 pb-8">
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
              <Drawer.Title className="mb-5 text-lg font-extrabold text-slate-900">Manage folders</Drawer.Title>

              <div className="mb-5 flex gap-2">
                <input
                  value={newFolderName}
                  placeholder="New folder name"
                  className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  onChange={event => setNewFolderName(event.target.value)}
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={newFolderName.trim() === ''}
                  aria-label="Create folder"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <PlusIcon className="size-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {folders.map(folder => (
                  <div key={folder.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                      {folder.name}
                    </span>
                    <span className="text-xs font-medium text-slate-400">{folder.cardIds.length} cards</span>
                    <button
                      onClick={() => handleDeleteFolder(folder.id)}
                      aria-label={`Delete ${folder.name}`}
                      className="p-1 text-red-500"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}
