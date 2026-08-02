import { ChevronLeftIcon, FingerprintIcon, LockIcon, PlusIcon, ScanFaceIcon } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { DocPass, docFaceGradient } from '@/components/DocPass'
import { AddDocumentDrawer, EditDocumentDrawer } from '@/components/DocumentDrawer'
import { useBrightnessBoost } from '@/hooks/use-brightness-boost'
import { lockMethodLabels, type LockMethod } from '@/lib/biometric'
import { pressable } from '@/lib/utils'
import { useDocumentsLock } from '@/state/documents-lock-context'
import { useWallet } from '@/state/wallet-context'

const lockIcons: Record<Exclude<LockMethod, 'none'>, typeof LockIcon> = {
  faceId: ScanFaceIcon,
  touchId: FingerprintIcon,
  fingerprint: FingerprintIcon,
  biometrics: ScanFaceIcon,
  passcode: LockIcon,
}

function LockGate({ method, onUnlock }: { method: Exclude<LockMethod, 'none'>; onUnlock: () => void }) {
  const Icon = lockIcons[method]
  const label = lockMethodLabels[method]

  return (
    <div className="flex flex-col items-center px-5 pt-20 text-center">
      <span
        className={`mb-6 flex size-16 items-center justify-center rounded-full text-white ring-1 ring-white/15 ${docFaceGradient}`}
      >
        <Icon className="size-7" />
      </span>
      <h2 className="text-lg font-extrabold text-foreground">Documents are locked</h2>
      <p className="mt-1 text-sm font-medium text-muted-foreground">IDs and licences stay behind {label}</p>
      <button
        onClick={onUnlock}
        className={`${pressable} mt-6 rounded-4xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/80`}
      >
        Unlock with {label}
      </button>
    </div>
  )
}

export function DocumentsScreen() {
  const { documents, addDocument, updateDocument, removeDocument } = useWallet()
  const { method, unlocked, unlock } = useDocumentsLock()
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const editingDoc = documents.find(doc => doc.id === editingId) ?? null

  useBrightnessBoost(unlocked && expandedId !== null)

  function handleToggle(id: string) {
    setExpandedId(current => (current === id ? null : id))
  }

  function handleDelete(id: string) {
    removeDocument(id)
    if (expandedId === id) setExpandedId(null)
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
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground">Documents</h1>
            <p className="text-xs font-medium text-muted-foreground/80">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </p>
          </div>
        </div>
      </header>

      {method !== null && method !== 'none' && !unlocked && (
        <LockGate method={method} onUnlock={() => void unlock()} />
      )}

      {unlocked && (
        <main className="flex flex-col gap-3 px-5 pb-32">
          <AnimatePresence initial={false}>
            {documents.map(doc => (
              <DocPass
                key={doc.id}
                doc={doc}
                active={doc.id === expandedId}
                onToggle={handleToggle}
                onEdit={setEditingId}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>

          <button
            onClick={() => setAddOpen(true)}
            className={`${pressable} flex flex-col items-center justify-center gap-1 rounded-2xl border-2! border-dashed! border-input! py-5 text-sm font-semibold text-muted-foreground hover:text-foreground`}
          >
            <span className="flex items-center gap-2">
              <PlusIcon className="size-4.5" />
              Add document
            </span>
            <span className="text-xs font-medium text-muted-foreground/70">IDs, licences, insurance cards</span>
          </button>

          <AddDocumentDrawer
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onAdd={doc => {
              addDocument(doc)
              setExpandedId(doc.id)
              setAddOpen(false)
            }}
          />
          <EditDocumentDrawer doc={editingDoc} onClose={() => setEditingId(null)} onChange={updateDocument} />
        </main>
      )}
    </div>
  )
}
