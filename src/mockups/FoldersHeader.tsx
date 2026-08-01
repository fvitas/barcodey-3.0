import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderPlusIcon,
  IdCardIcon,
  LayoutGridIcon,
  LockIcon,
  MinusCircleIcon,
  PlusIcon,
  ScanFaceIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
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

function Pass({ card, trailing }: { card: LoyaltyCard; trailing?: React.ReactNode }) {
  return (
    <div
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
      {trailing}
    </div>
  )
}

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -32 }}
      transition={{ type: 'spring', stiffness: 400, damping: 36 }}
    >
      {children}
    </motion.div>
  )
}

export function FoldersHeader() {
  const [screen, setScreen] = useState<'home' | 'folders'>('home')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState(initialFolders)
  const [documentsLocked, setDocumentsLocked] = useState(true)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [addingToFolderId, setAddingToFolderId] = useState<string | null>(null)

  const openFolder = folders.find(folder => folder.id === openFolderId) ?? null
  const assignedIds = new Set(folders.flatMap(folder => folder.cardIds))
  const unassignedCards = mockCards.filter(card => !assignedIds.has(card.id))

  function cardsIn(folder: Folder) {
    return folder.cardIds
      .map(id => mockCards.find(card => card.id === id))
      .filter(card => card !== undefined)
  }

  function handleCreateFolder() {
    const name = newFolderName.trim()
    if (name === '') return
    setFolders(current => [...current, { id: crypto.randomUUID(), name, cardIds: [] }])
    setNewFolderName('')
    setNewFolderOpen(false)
  }

  function handleRemoveFromFolder(folderId: string, cardId: string) {
    setFolders(current =>
      current.map(folder =>
        folder.id === folderId ? { ...folder, cardIds: folder.cardIds.filter(id => id !== cardId) } : folder,
      ),
    )
  }

  function handleAddToFolder(folderId: string, cardId: string) {
    setFolders(current =>
      current.map(folder =>
        folder.id === folderId ? { ...folder, cardIds: [...folder.cardIds, cardId] } : folder,
      ),
    )
  }

  const screenKey = openFolderId !== null ? `folder-${openFolderId}` : screen

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem] overflow-x-hidden bg-slate-100 pb-28">
      <AnimatePresence mode="wait" initial={false}>
        {screenKey === 'home' && (
          <ScreenShell key="home">
            <header className="px-5 pt-8 pb-4">
              <div className="mb-5 flex items-center justify-between">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Barcodey<span className="text-blue-600">.</span>
                </h1>

                <div className="flex gap-2">
                  <button
                    onClick={() => setScreen('folders')}
                    className="flex size-10 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm"
                    aria-label="Folders"
                  >
                    <FolderIcon className="size-5" />
                  </button>
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

              <div className="flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-1.5 pl-4 shadow-sm">
                <SearchIcon className="size-4.5 shrink-0 text-slate-400" />
                <input
                  placeholder="Search cards"
                  className="w-full bg-transparent py-1.5 text-sm font-medium outline-none placeholder:text-slate-400"
                />
              </div>
            </header>

            <main className="flex flex-col gap-3 px-5">
              {mockCards.map(card => (
                <Pass key={card.id} card={card} />
              ))}
            </main>

            <button
              aria-label="Add card"
              className="fixed right-5 bottom-6 z-30 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30"
            >
              <PlusIcon className="size-6" />
            </button>
          </ScreenShell>
        )}

        {screenKey === 'folders' && (
          <ScreenShell key="folders">
            <header className="flex items-center justify-between px-5 pt-8 pb-5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScreen('home')}
                  className="-ml-2 flex size-10 items-center justify-center rounded-full text-slate-500"
                  aria-label="Back"
                >
                  <ChevronLeftIcon className="size-6" />
                </button>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Folders</h1>
              </div>

              <button
                onClick={() => setNewFolderOpen(true)}
                className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"
                aria-label="New folder"
              >
                <FolderPlusIcon className="size-5" />
              </button>
            </header>

            <main className="flex flex-col gap-3 px-5">
              {folders.map(folder => {
                const folderCards = cardsIn(folder)
                return (
                  <button
                    key={folder.id}
                    onClick={() => setOpenFolderId(folder.id)}
                    className="flex w-full items-center gap-3.5 rounded-2xl bg-white p-4 text-left shadow-sm"
                  >
                    <div className="flex w-16 shrink-0 -space-x-3">
                      {folderCards.slice(0, 3).map(card => (
                        <span
                          key={card.id}
                          className={`size-9 rounded-lg ring-2 ring-white ${cardThemeGradients[card.theme]}`}
                        />
                      ))}
                      {folderCards.length === 0 && (
                        <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <FolderIcon className="size-4" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-slate-900">{folder.name}</p>
                      <p className="text-xs font-medium text-slate-400">
                        {folderCards.length} {folderCards.length === 1 ? 'card' : 'cards'}
                      </p>
                    </div>

                    <ChevronRightIcon className="size-5 shrink-0 text-slate-300" />
                  </button>
                )
              })}

              <button
                onClick={() => setOpenFolderId('documents')}
                className="flex w-full items-center gap-3.5 rounded-2xl bg-slate-900 p-4 text-left shadow-md shadow-slate-900/25"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                  <IdCardIcon className="size-4.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-extrabold text-white">
                    Documents
                    <LockIcon className="size-3.5 text-white/50" />
                  </p>
                  <p className="text-xs font-medium text-white/50">{mockDocuments.length} documents · Face ID</p>
                </div>

                <ChevronRightIcon className="size-5 shrink-0 text-white/30" />
              </button>
            </main>
          </ScreenShell>
        )}

        {openFolder !== null && (
          <ScreenShell key={`folder-${openFolder.id}`}>
            <header className="flex items-center gap-2 px-5 pt-8 pb-5">
              <button
                onClick={() => setOpenFolderId(null)}
                className="-ml-2 flex size-10 items-center justify-center rounded-full text-slate-500"
                aria-label="Back"
              >
                <ChevronLeftIcon className="size-6" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{openFolder.name}</h1>
                <p className="text-xs font-medium text-slate-400">{openFolder.cardIds.length} cards</p>
              </div>
            </header>

            <main className="flex flex-col gap-3 px-5">
              {cardsIn(openFolder).map(card => (
                <Pass
                  key={card.id}
                  card={card}
                  trailing={
                    <button
                      onClick={() => handleRemoveFromFolder(openFolder.id, card.id)}
                      className="relative shrink-0 p-1 text-white/60"
                      aria-label="Remove from folder"
                    >
                      <MinusCircleIcon className="size-5" />
                    </button>
                  }
                />
              ))}

              <button
                onClick={() => setAddingToFolderId(openFolder.id)}
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500"
              >
                <PlusIcon className="size-4.5" />
                Add cards to this folder
              </button>
            </main>
          </ScreenShell>
        )}

        {screenKey === 'folder-documents' && (
          <ScreenShell key="folder-documents">
            <header className="flex items-center gap-2 px-5 pt-8 pb-5">
              <button
                onClick={() => setOpenFolderId(null)}
                className="-ml-2 flex size-10 items-center justify-center rounded-full text-slate-500"
                aria-label="Back"
              >
                <ChevronLeftIcon className="size-6" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Documents</h1>
                <p className="text-xs font-medium text-slate-400">{mockDocuments.length} documents</p>
              </div>
            </header>

            <main className="px-5">
              {documentsLocked ? (
                <div className="mt-16 flex flex-col items-center text-center">
                  <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-slate-900 text-white">
                    <ScanFaceIcon className="size-8" />
                  </span>
                  <h2 className="mb-1 text-lg font-extrabold text-slate-900">Documents are locked</h2>
                  <p className="mb-6 text-sm font-medium text-slate-500">
                    IDs and licences stay behind Face ID
                  </p>
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
              )}
            </main>
          </ScreenShell>
        )}
      </AnimatePresence>

      <Drawer.Root open={newFolderOpen} onOpenChange={open => !open && setNewFolderOpen(false)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
            <div className="px-5 pt-3 pb-8">
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
              <Drawer.Title className="mb-5 text-lg font-extrabold text-slate-900">New folder</Drawer.Title>

              <input
                value={newFolderName}
                placeholder="e.g. Groceries"
                autoFocus
                className="mb-5 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                onChange={event => setNewFolderName(event.target.value)}
              />

              <button
                onClick={handleCreateFolder}
                disabled={newFolderName.trim() === ''}
                className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                Create folder
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Drawer.Root open={addingToFolderId !== null} onOpenChange={open => !open && setAddingToFolderId(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
            <div className="px-5 pt-3 pb-8">
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
              <Drawer.Title className="mb-1 text-lg font-extrabold text-slate-900">Add cards</Drawer.Title>
              <p className="mb-5 text-xs font-medium text-slate-400">
                A card lives in one folder — only unfiled cards are shown
              </p>

              <div className="flex flex-col gap-2">
                {unassignedCards.map(card => (
                  <button
                    key={card.id}
                    onClick={() => addingToFolderId !== null && handleAddToFolder(addingToFolderId, card.id)}
                    className="flex w-full items-center gap-3 rounded-xl bg-slate-50 p-3 text-left"
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${cardThemeGradients[card.theme]}`}
                    >
                      {card.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                      {card.name}
                    </span>
                    <PlusIcon className="size-4.5 shrink-0 text-blue-600" />
                  </button>
                ))}

                {unassignedCards.length === 0 && (
                  <p className="py-6 text-center text-sm font-medium text-slate-400">
                    Every card is already in a folder
                  </p>
                )}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}
