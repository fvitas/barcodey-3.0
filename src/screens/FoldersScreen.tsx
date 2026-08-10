import { FolderIcon, FolderPlusIcon, IdCardIcon, LockIcon, PlusIcon, SettingsIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Drawer } from 'vaul'
import { SettingsDrawer } from '@/components/SettingsDrawer'
import { Input } from '@/components/ui/input'
import { cardFace } from '@/lib/color'
import type { Card } from '@/lib/model'
import { pressable } from '@/lib/utils'
import { useWallet } from '@/state/wallet-context'

const fanRotations = [-10, 6, 0]

function FanPreview({ cards }: { cards: Card[] }) {
  return (
    <div className="relative mb-3 flex h-16 items-center justify-center">
      {cards.slice(0, 3).map((card, index) => (
        <span
          key={card.id}
          className={`absolute h-12 w-18 rounded-lg shadow-md shadow-slate-900/15 ring-2 ring-card ${cardFace(card).className}`}
          style={{
            ...cardFace(card).style,
            transform: `rotate(${fanRotations[index]}deg) translateX(${(index - 1) * 14}px)`,
            zIndex: index === 2 ? 2 : index,
          }}
        />
      ))}
      {cards.length === 0 && (
        <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground/70">
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

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-foreground">New folder</Drawer.Title>

            <Input
              value={name}
              placeholder="e.g. Groceries"
              className="mb-5 h-11 px-4 text-sm font-semibold"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
            />

            <button
              onClick={handleCreate}
              disabled={name.trim() === ''}
              className={`${pressable} w-full rounded-4xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/80`}
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
  const { cards, folders, documents, createFolder } = useWallet()
  const navigate = useNavigate()
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  function cardsIn(folderId: string): Card[] {
    return cards.filter(card => card.folderId === folderId)
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem]">
      <header className="flex items-center justify-between px-5 pt-8 pb-5">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Barcodey<span className="text-primary"> · </span>Folders
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => setNewFolderOpen(true)}
            className={`${pressable} flex size-10 items-center justify-center rounded-full bg-card text-primary shadow-sm`}
            aria-label="New folder"
          >
            <FolderPlusIcon className="size-5" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className={`${pressable} flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm hover:text-foreground`}
            aria-label="Settings"
          >
            <SettingsIcon className="size-5" />
          </button>
        </div>
      </header>

      <main className="grid grid-cols-2 gap-3 px-5 pb-32">
        {folders.map(folder => {
          const folderCards = cardsIn(folder.id)
          return (
            <button
              key={folder.id}
              onClick={() => navigate(`/folders/${folder.id}`)}
              className={`${pressable} rounded-2xl bg-card p-4 text-left shadow-sm`}
            >
              <FanPreview cards={folderCards} />
              <p className="truncate font-extrabold text-foreground">{folder.name}</p>
              <p className="text-xs font-medium text-muted-foreground/80">
                {folderCards.length} {folderCards.length === 1 ? 'card' : 'cards'}
              </p>
            </button>
          )
        })}

        <button
          onClick={() => navigate('/folders/documents')}
          className={`${pressable} rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 bg-origin-border p-4 text-left shadow-sm ring-1 ring-white/10`}
        >
          <div className="mb-3 flex h-16 items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-white/80">
              <IdCardIcon className="size-6" />
            </span>
          </div>
          <p className="flex items-center gap-1.5 truncate font-extrabold text-white">
            Documents
            <LockIcon className="size-3.5 shrink-0 text-white/60" />
          </p>
          <p className="text-xs font-medium text-white/50">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </p>
        </button>

        <button
          onClick={() => setNewFolderOpen(true)}
          className={`${pressable} flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border-2! border-dashed! border-input! text-sm font-semibold text-muted-foreground hover:text-foreground`}
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

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
