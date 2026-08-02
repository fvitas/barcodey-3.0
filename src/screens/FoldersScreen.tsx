import { FolderIcon, FolderPlusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Drawer } from 'vaul'
import { cardThemeGradients, type Card } from '@/lib/model'
import { useWallet } from '@/state/wallet-context'

const fanRotations = [-10, 6, 0]

function FanPreview({ cards }: { cards: Card[] }) {
  return (
    <div className="relative mb-3 flex h-16 items-center justify-center">
      {cards.slice(0, 3).map((card, index) => (
        <span
          key={card.id}
          className={`absolute h-12 w-18 rounded-lg shadow-md shadow-slate-900/15 ring-2 ring-white ${cardThemeGradients[card.theme]}`}
          style={{
            transform: `rotate(${fanRotations[index]}deg) translateX(${(index - 1) * 14}px)`,
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

type NewFolderDrawerProps = {
  open: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

function NewFolderDrawer({ open, onClose, onCreate }: NewFolderDrawerProps) {
  const [name, setName] = useState('')

  function handleClose() {
    setName('')
    onClose()
  }

  function handleCreate() {
    const trimmed = name.trim()
    if (trimmed === '') return
    onCreate(trimmed)
    handleClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-slate-900">New folder</Drawer.Title>

            <input
              value={name}
              placeholder="e.g. Groceries"
              className="mb-5 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
              onChange={event => setName(event.target.value)}
            />

            <button
              onClick={handleCreate}
              disabled={name.trim() === ''}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              Create folder
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export function FoldersScreen() {
  const { cards, folders, createFolder } = useWallet()
  const navigate = useNavigate()
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  function cardsIn(folderId: string): Card[] {
    return cards.filter(card => card.folderId === folderId)
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem] bg-slate-100">
      <header className="flex items-center justify-between px-5 pt-8 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Folders<span className="text-blue-600">.</span>
        </h1>

        <button
          onClick={() => setNewFolderOpen(true)}
          className="flex size-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm"
          aria-label="New folder"
        >
          <FolderPlusIcon className="size-5" />
        </button>
      </header>

      <main className="grid grid-cols-2 gap-3 px-5 pb-32">
        {folders.map(folder => {
          const folderCards = cardsIn(folder.id)
          return (
            <button
              key={folder.id}
              onClick={() => navigate(`/folders/${folder.id}`)}
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
          onClick={() => setNewFolderOpen(true)}
          className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500"
        >
          <PlusIcon className="size-5" />
          New folder
        </button>
      </main>

      <NewFolderDrawer
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreate={name => createFolder(name)}
      />
    </div>
  )
}
