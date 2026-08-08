import { ChevronLeftIcon, MinusCircleIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Drawer } from 'vaul'
import { EditDrawer } from '@/components/EditDrawer'
import { WallPass } from '@/components/WallPass'
import { Input } from '@/components/ui/input'
import { useBrightnessBoost } from '@/hooks/use-brightness-boost'
import { cardThemeGradients, type Card, type Folder } from '@/lib/model'
import { pressable } from '@/lib/utils'
import { useUiState } from '@/state/ui-state-context'
import { useWallet } from '@/state/wallet-context'

type AddCardsDrawerProps = {
  open: boolean
  unfiledCards: Card[]
  onClose: () => void
  onAdd: (cardId: string) => void
}

function AddCardsDrawer({ open, unfiledCards, onClose, onAdd }: AddCardsDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-[26rem] flex-col rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-1 text-lg font-extrabold text-foreground">Add cards</Drawer.Title>
            <p className="mb-5 text-xs font-medium text-muted-foreground/80">
              A card lives in one folder — only unfiled cards are shown
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
            <div className="flex flex-col gap-2">
              {unfiledCards.map(card => (
                <button
                  key={card.id}
                  onClick={() => onAdd(card.id)}
                  className={`${pressable} flex w-full items-center gap-3 rounded-xl bg-muted/60 p-3 text-left hover:bg-muted`}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${cardThemeGradients[card.theme]}`}
                  >
                    {card.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {card.name}
                  </span>
                  <PlusIcon className="mr-2 size-4.5 shrink-0 text-primary" />
                </button>
              ))}

              {unfiledCards.length === 0 && (
                <p className="py-6 text-center text-sm font-medium text-muted-foreground">
                  Every card is already in a folder
                </p>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

type FolderEditDrawerProps = {
  folder: Folder
  open: boolean
  onClose: () => void
  onRename: (name: string) => void
  onDelete: () => void
}

function FolderEditDrawer({ folder, open, onClose, onRename, onDelete }: FolderEditDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-foreground">Edit folder</Drawer.Title>

            <label className="mb-5 block">
              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                Name
              </span>
              <Input
                value={folder.name}
                className="h-11 px-4 text-sm font-semibold"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => onRename(event.target.value)}
              />
            </label>

            <button
              onClick={onDelete}
              className={`${pressable} mb-3 flex w-full items-center justify-center gap-2 rounded-4xl bg-destructive py-3 text-sm font-semibold text-white hover:bg-destructive/80`}
            >
              <Trash2Icon className="size-4" />
              Delete folder
            </button>

            <button
              onClick={onClose}
              className={`${pressable} w-full rounded-4xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/80`}
            >
              Done
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export function FolderScreen() {
  const { folderId } = useParams()
  const { cards, folders, updateCard, removeCard, renameFolder, removeFolder, setCardFolder } = useWallet()
  const { state, update } = useUiState()
  const navigate = useNavigate()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addCardsOpen, setAddCardsOpen] = useState(false)
  const [folderEditOpen, setFolderEditOpen] = useState(false)

  const folder = folders.find(current => current.id === folderId) ?? null

  useBrightnessBoost(state.expandedCardId !== null)

  if (folder === null) {
    return <Navigate to="/folders" replace />
  }

  const folderCards = cards.filter(card => card.folderId === folder.id)
  const unfiledCards = cards.filter(card => card.folderId === null)
  const editingCard = cards.find(card => card.id === editingId) ?? null

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

  function handleDeleteFolder() {
    if (folder !== null) {
      removeFolder(folder.id)
    }
    navigate('/folders', { replace: true })
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem]">
      <header className="flex items-center justify-between px-5 pt-8 pb-5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => navigate('/folders')}
            className={`${pressable} -ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground`}
            aria-label="Back"
          >
            <ChevronLeftIcon className="size-6" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground">{folder.name}</h1>
            <p className="text-xs font-medium text-muted-foreground/80">
              {folderCards.length} {folderCards.length === 1 ? 'card' : 'cards'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setFolderEditOpen(true)}
          className={`${pressable} flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm hover:text-foreground`}
          aria-label="Edit folder"
        >
          <PencilIcon className="size-4.5" />
        </button>
      </header>

      <main className="flex flex-col gap-3 px-5 pb-32">
        <AnimatePresence initial={false}>
          {folderCards.map(card => (
            <WallPass
              key={card.id}
              card={card}
              active={card.id === state.expandedCardId}
              view="list"
              trailing={
                <button
                  onClick={() => setCardFolder(card.id, null)}
                  className="relative shrink-0 p-1 text-white/60"
                  aria-label="Remove from folder"
                >
                  <MinusCircleIcon className="size-5" />
                </button>
              }
              onToggle={handleToggle}
              onEdit={setEditingId}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </AnimatePresence>

        <button
          onClick={() => setAddCardsOpen(true)}
          className={`${pressable} flex items-center justify-center gap-2 rounded-2xl border-2! border-dashed! border-input! py-4 text-sm font-semibold text-muted-foreground hover:text-foreground`}
        >
          <PlusIcon className="size-4.5" />
          Add cards to this folder
        </button>
      </main>

      <AddCardsDrawer
        open={addCardsOpen}
        unfiledCards={unfiledCards}
        onClose={() => setAddCardsOpen(false)}
        onAdd={cardId => setCardFolder(cardId, folder.id)}
      />
      <FolderEditDrawer
        folder={folder}
        open={folderEditOpen}
        onClose={() => setFolderEditOpen(false)}
        onRename={name => renameFolder(folder.id, name)}
        onDelete={handleDeleteFolder}
      />
      <EditDrawer card={editingCard} onClose={() => setEditingId(null)} onChange={updateCard} />
    </div>
  )
}
