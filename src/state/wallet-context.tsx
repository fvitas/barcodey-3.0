import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { emptyWallet, type Card, type Doc, type Folder, type Wallet } from '@/lib/model'
import { deleteCardPhotos } from '@/lib/photos'
import { cardStore } from '@/lib/store'

type WalletContextValue = {
  ready: boolean
  cards: Card[]
  folders: Folder[]
  documents: Doc[]
  addCard: (card: Card) => void
  updateCard: (id: string, patch: Partial<Omit<Card, 'id'>>) => void
  removeCard: (id: string) => void
  moveCard: (activeId: string, overId: string) => void
  createFolder: (name: string) => Folder
  renameFolder: (id: string, name: string) => void
  removeFolder: (id: string) => void
  setCardFolder: (cardId: string, folderId: string | null) => void
  addDocument: (doc: Doc) => void
  updateDocument: (id: string, patch: Partial<Omit<Doc, 'id'>>) => void
  removeDocument: (id: string) => void
  replaceWallet: (wallet: Wallet) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState(emptyWallet)
  const [ready, setReady] = useState(false)
  const loadStarted = useRef(false)

  useEffect(() => {
    if (loadStarted.current) return
    loadStarted.current = true
    void cardStore.load().then(loaded => {
      setWallet(loaded)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    void cardStore.save(wallet)
  }, [ready, wallet])

  function addCard(card: Card) {
    setWallet(current => ({ ...current, cards: [card, ...current.cards] }))
  }

  function updateCard(id: string, patch: Partial<Omit<Card, 'id'>>) {
    setWallet(current => ({
      ...current,
      cards: current.cards.map(card => (card.id === id ? { ...card, ...patch } : card)),
    }))
  }

  function removeCard(id: string) {
    const card = wallet.cards.find(card => card.id === id)
    if (card !== undefined) void deleteCardPhotos(card.photos)
    setWallet(current => ({ ...current, cards: current.cards.filter(card => card.id !== id) }))
  }

  // manual order = array order in wallet.json
  function moveCard(activeId: string, overId: string) {
    setWallet(current => {
      const from = current.cards.findIndex(card => card.id === activeId)
      const to = current.cards.findIndex(card => card.id === overId)
      if (from === -1 || to === -1 || from === to) return current
      const cards = [...current.cards]
      const [moved] = cards.splice(from, 1)
      cards.splice(to, 0, moved)
      return { ...current, cards }
    })
  }

  function createFolder(name: string): Folder {
    const folder: Folder = { id: crypto.randomUUID(), name }
    setWallet(current => ({ ...current, folders: [...current.folders, folder] }))
    return folder
  }

  function renameFolder(id: string, name: string) {
    setWallet(current => ({
      ...current,
      folders: current.folders.map(folder => (folder.id === id ? { ...folder, name } : folder)),
    }))
  }

  function removeFolder(id: string) {
    // cards in the folder return to the unfiled wall, never deleted
    setWallet(current => ({
      ...current,
      folders: current.folders.filter(folder => folder.id !== id),
      cards: current.cards.map(card => (card.folderId === id ? { ...card, folderId: null } : card)),
    }))
  }

  function setCardFolder(cardId: string, folderId: string | null) {
    setWallet(current => ({
      ...current,
      cards: current.cards.map(card => (card.id === cardId ? { ...card, folderId } : card)),
    }))
  }

  function addDocument(doc: Doc) {
    setWallet(current => ({ ...current, documents: [doc, ...current.documents] }))
  }

  function updateDocument(id: string, patch: Partial<Omit<Doc, 'id'>>) {
    setWallet(current => ({
      ...current,
      documents: current.documents.map(doc => (doc.id === id ? { ...doc, ...patch } : doc)),
    }))
  }

  function removeDocument(id: string) {
    const doc = wallet.documents.find(doc => doc.id === id)
    if (doc !== undefined) void deleteCardPhotos(doc.photos)
    setWallet(current => ({ ...current, documents: current.documents.filter(doc => doc.id !== id) }))
  }

  function replaceWallet(next: Wallet) {
    setWallet(next)
  }

  return (
    <WalletContext.Provider
      value={{
        ready,
        cards: wallet.cards,
        folders: wallet.folders,
        documents: wallet.documents,
        addCard,
        updateCard,
        removeCard,
        moveCard,
        createFolder,
        renameFolder,
        removeFolder,
        setCardFolder,
        addDocument,
        updateDocument,
        removeDocument,
        replaceWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletContextValue {
  const value = useContext(WalletContext)
  if (value === null) throw new Error('useWallet must be used inside WalletProvider')
  return value
}
