import { useState } from 'react'
import { EmptyLab } from '@/mockups/EmptyLab'
import { FoldersChips } from '@/mockups/FoldersChips'
import { FoldersHeader } from '@/mockups/FoldersHeader'
import { FoldersTabs } from '@/mockups/FoldersTabs'
import { TicketWall } from '@/mockups/TicketWall'
import { WarmWallet } from '@/mockups/WarmWallet'

function EmptyTicketWall() {
  return <TicketWall initialCards={[]} />
}

const mockupVariants = [
  { id: '1', name: 'Warm Wallet', Component: WarmWallet },
  { id: '2', name: 'Ticket Wall', Component: TicketWall },
  { id: '3', name: 'Empty State', Component: EmptyTicketWall },
  { id: '4', name: 'Empty Lab', Component: EmptyLab },
  { id: '5', name: 'Folders · Header', Component: FoldersHeader },
  { id: '6', name: 'Folders · Tabs', Component: FoldersTabs },
  { id: '7', name: 'Folders · Chips', Component: FoldersChips },
]

function initialVariantId() {
  const fromHash = window.location.hash.replace('#', '')
  return mockupVariants.some(variant => variant.id === fromHash) ? fromHash : '1'
}

export function App() {
  const [variantId, setVariantId] = useState(initialVariantId)

  const active = mockupVariants.find(variant => variant.id === variantId) ?? mockupVariants[0]

  function selectVariant(id: string) {
    setVariantId(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <>
      <div className="fixed top-2 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-1 rounded-full bg-stone-900/85 px-2 py-1.5 text-white shadow-lg backdrop-blur">
        {mockupVariants.map(variant => (
          <button
            key={variant.id}
            onClick={() => selectVariant(variant.id)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              variant.id === variantId ? 'bg-white text-stone-900' : 'text-white/60'
            }`}
          >
            {variant.id}
          </button>
        ))}
      </div>

      <active.Component key={active.id} />
    </>
  )
}
