import {
  ChevronLeftIcon,
  FolderIcon,
  FolderPlusIcon,
  IdCardIcon,
  LayoutGridIcon,
  LockIcon,
  PlusIcon,
  ScanFaceIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
  WalletCardsIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { cardThemeGradients, mockCards, type LoyaltyCard } from '@/lib/cards'

const formatLabels = { ean13: 'EAN-13', code128: 'CODE 128', qrcode: 'QR' }

type Folder = { id: string; name: string; cardIds: string[] }

const folders: Folder[] = [
  { id: 'groceries', name: 'Groceries', cardIds: ['lidl', 'maxi', 'dm'] },
  { id: 'home', name: 'Home & Furniture', cardIds: ['ikea', 'idea'] },
  { id: 'sport', name: 'Sport', cardIds: ['decathlon'] },
]

const mockDocuments = [
  { id: 'id-card', name: 'ID Card', hint: 'Expires Mar 2029' },
  { id: 'licence', name: 'Driving Licence', hint: 'Expires Nov 2027' },
]

const tabs = [
  { id: 'wallet', label: 'Wallet', Icon: WalletCardsIcon },
  { id: 'folders', label: 'Folders', Icon: FolderIcon },
] as const

type Tab = (typeof tabs)[number]['id']

function Pass({ card }: { card: LoyaltyCard }) {
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
    </div>
  )
}

function FanPreview({ cards }: { cards: LoyaltyCard[] }) {
  const rotations = [-10, 6, 0]
  return (
    <div className="relative mb-3 flex h-16 items-center justify-center">
      {cards.slice(0, 3).map((card, index) => (
        <span
          key={card.id}
          className={`absolute h-12 w-18 rounded-lg shadow-md shadow-slate-900/15 ring-2 ring-white ${cardThemeGradients[card.theme]}`}
          style={{
            transform: `rotate(${rotations[index]}deg) translateX(${(index - 1) * 14}px)`,
            zIndex: index === 2 ? 2 : index,
          }}
        />
      ))}
      {cards.length === 0 && (
        <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
          <FolderIcon className="size-5" />
        </span>
      )}
    </div>
  )
}

type TabButtonProps = {
  tab: (typeof tabs)[number]
  active: boolean
  onSelect: (id: Tab) => void
}

function TabButton({ tab, active, onSelect }: TabButtonProps) {
  return (
    <button
      onClick={() => onSelect(tab.id)}
      className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 ${
        active ? 'text-blue-600' : 'text-slate-400'
      }`}
    >
      {active && (
        <motion.span
          layoutId="tab-pill"
          className="absolute inset-0 rounded-full bg-blue-50"
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        />
      )}
      <tab.Icon className="relative size-5" />
      <span className="relative text-[0.625rem] font-bold">{tab.label}</span>
    </button>
  )
}

export function FoldersTabs() {
  const [tab, setTab] = useState<Tab>('wallet')
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [documentsLocked, setDocumentsLocked] = useState(true)

  const openFolder = folders.find(folder => folder.id === openFolderId) ?? null

  function cardsIn(folder: Folder) {
    return folder.cardIds
      .map(id => mockCards.find(card => card.id === id))
      .filter(card => card !== undefined)
  }

  function selectTab(next: Tab) {
    setTab(next)
    setOpenFolderId(null)
  }

  const screenKey = openFolderId !== null ? `folder-${openFolderId}` : tab

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem] overflow-x-hidden bg-slate-100 pb-32">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screenKey}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ type: 'spring', stiffness: 400, damping: 36 }}
        >
          {screenKey === 'wallet' && (
            <>
              <header className="px-5 pt-8 pb-4">
                <div className="mb-5 flex items-center justify-between">
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
            </>
          )}

          {screenKey === 'folders' && (
            <>
              <header className="flex items-center justify-between px-5 pt-8 pb-5">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Folders<span className="text-blue-600">.</span>
                </h1>

                <button
                  className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"
                  aria-label="New folder"
                >
                  <FolderPlusIcon className="size-5" />
                </button>
              </header>

              <main className="grid grid-cols-2 gap-3 px-5">
                {folders.map(folder => {
                  const folderCards = cardsIn(folder)
                  return (
                    <button
                      key={folder.id}
                      onClick={() => setOpenFolderId(folder.id)}
                      className="rounded-2xl bg-white p-4 text-left shadow-sm"
                    >
                      <FanPreview cards={folderCards} />
                      <p className="truncate font-extrabold text-slate-900">{folder.name}</p>
                      <p className="text-xs font-medium text-slate-400">
                        {folderCards.length} {folderCards.length === 1 ? 'card' : 'cards'}
                      </p>
                    </button>
                  )
                })}

                <button
                  onClick={() => setOpenFolderId('documents')}
                  className="rounded-2xl bg-slate-900 p-4 text-left shadow-md shadow-slate-900/25"
                >
                  <div className="mb-3 flex h-16 items-center justify-center">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-white/15 text-white">
                      <IdCardIcon className="size-6" />
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 font-extrabold text-white">
                    Documents
                    <LockIcon className="size-3.5 text-white/50" />
                  </p>
                  <p className="text-xs font-medium text-white/50">{mockDocuments.length} documents</p>
                </button>

                <button className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500">
                  <PlusIcon className="size-5" />
                  New folder
                </button>
              </main>
            </>
          )}

          {openFolder !== null && (
            <>
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
                  <Pass key={card.id} card={card} />
                ))}
              </main>
            </>
          )}

          {screenKey === 'folder-documents' && (
            <>
              <header className="flex items-center gap-2 px-5 pt-8 pb-5">
                <button
                  onClick={() => setOpenFolderId(null)}
                  className="-ml-2 flex size-10 items-center justify-center rounded-full text-slate-500"
                  aria-label="Back"
                >
                  <ChevronLeftIcon className="size-6" />
                </button>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Documents</h1>
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
            </>
          )}
        </motion.div>
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[21rem] items-center rounded-full bg-white/95 px-3 py-2 shadow-xl shadow-slate-900/15 ring-1 ring-slate-900/5 backdrop-blur">
        <TabButton tab={tabs[0]} active={tab === tabs[0].id} onSelect={selectTab} />

        <button
          aria-label="Add card"
          className="mx-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30"
        >
          <PlusIcon className="size-6" />
        </button>

        <TabButton tab={tabs[1]} active={tab === tabs[1].id} onSelect={selectTab} />
      </nav>
    </div>
  )
}
