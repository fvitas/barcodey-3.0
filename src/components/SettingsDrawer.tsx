import { useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { exportBackup } from '@/lib/backup'
import { authenticateForDocuments, lockMethodLabels } from '@/lib/biometric'
import { viewModes, walletSchema, type Wallet } from '@/lib/model'
import { requestNotificationPermission } from '@/lib/notifications'
import { pressable } from '@/lib/utils'
import { useDocumentsLock } from '@/state/documents-lock-context'
import { useUiState } from '@/state/ui-state-context'
import { useWallet } from '@/state/wallet-context'

type SettingsDrawerProps = {
  open: boolean
  onClose: () => void
}

const appearances = ['light', 'dark', 'system'] as const
const views = viewModes

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { cards, folders, documents, replaceWallet } = useWallet()
  const { state, update } = useUiState()
  const { method } = useDocumentsLock()
  const importInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<Wallet | null>(null)
  const [importError, setImportError] = useState(false)
  const [remindersDenied, setRemindersDenied] = useState(false)

  const lockAvailable = method !== null && method !== 'none'

  function handleLockToggle(checked: boolean) {
    if (checked) {
      update({ lockDocuments: true })
      return
    }
    // switching the lock off has to pass the lock first, or it protects nothing
    void authenticateForDocuments().then(ok => ok && update({ lockDocuments: false }))
  }

  function handleRemindersToggle(checked: boolean) {
    if (!checked) {
      setRemindersDenied(false)
      update({ expiryReminders: false })
      return
    }
    void requestNotificationPermission().then(granted => {
      setRemindersDenied(!granted)
      if (granted) update({ expiryReminders: true })
    })
  }

  function handleExport() {
    const wallet: Wallet = { version: 1, cards, folders, documents }
    void exportBackup(wallet)
  }

  function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return

    void file.text().then(text => {
      let parsed: ReturnType<typeof walletSchema.safeParse>
      try {
        parsed = walletSchema.safeParse(JSON.parse(text))
      } catch {
        setImportError(true)
        return
      }
      if (!parsed.success) {
        setImportError(true)
        return
      }
      setImportError(false)
      setPendingImport(parsed.data)
    })
  }

  function handleConfirmImport() {
    if (pendingImport === null) return
    replaceWallet(pendingImport)
    setPendingImport(null)
    onClose()
  }

  return (
    <Drawer.Root
      open={open}
      onOpenChange={isOpen => {
        if (isOpen) return
        setImportError(false)
        onClose()
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-foreground">Settings</Drawer.Title>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              Appearance
            </span>
            <Tabs
              value={state.appearance}
              onValueChange={value => update({ appearance: value as (typeof appearances)[number] })}
              className="mb-5"
            >
              <TabsList className="h-11! w-full">
                {appearances.map(option => (
                  <TabsTrigger key={option} value={option} className="font-semibold capitalize">
                    {option}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              View
            </span>
            <Tabs
              value={state.view}
              onValueChange={value => update({ view: value as (typeof views)[number] })}
              className="mb-5"
            >
              <TabsList className="h-11! w-full">
                {views.map(option => (
                  <TabsTrigger key={option} value={option} className="font-semibold capitalize">
                    {option}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              Documents
            </span>
            <div className="mb-5 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-semibold text-foreground">Biometric lock</p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground/80">
                  {lockAvailable
                    ? `${lockMethodLabels[method]} required to open Documents`
                    : 'Set a passcode on this device to enable'}
                </p>
              </div>
              <Switch
                checked={lockAvailable && state.lockDocuments}
                disabled={!lockAvailable}
                onCheckedChange={handleLockToggle}
                aria-label="Biometric lock"
              />
            </div>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              Notifications
            </span>
            <div className="mb-5 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-semibold text-foreground">Expiry notifications</p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground/80">
                  {remindersDenied
                    ? 'Allow notifications in device Settings to enable'
                    : '30, 7 and 1 day before a card or document expires'}
                </p>
              </div>
              <Switch
                checked={state.expiryReminders}
                onCheckedChange={handleRemindersToggle}
                aria-label="Expiry notifications"
              />
            </div>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              Backup
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className={`${pressable} rounded-4xl bg-muted py-3 text-sm font-semibold text-foreground/80 hover:text-foreground`}
              >
                Export cards
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className={`${pressable} rounded-4xl bg-muted py-3 text-sm font-semibold text-foreground/80 hover:text-foreground`}
              >
                Import backup
              </button>
            </div>
            {importError && (
              <p className="mt-2 text-center text-xs font-medium text-destructive">
                Not a valid Barcodey backup file
              </p>
            )}
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />

          </div>
        </Drawer.Content>
      </Drawer.Portal>

      <Drawer.NestedRoot open={pendingImport !== null} onOpenChange={isOpen => !isOpen && setPendingImport(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />

          <Drawer.Content className="fixed inset-x-0 bottom-0 z-60 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
            <div className="px-5 pt-3 pb-8">
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
              <Drawer.Title className="mb-2 text-lg font-extrabold text-foreground">Replace wallet?</Drawer.Title>

              <p className="mb-6 text-sm text-muted-foreground">
                This backup contains {countLabel(pendingImport?.cards.length ?? 0, 'card')},{' '}
                {countLabel(pendingImport?.folders.length ?? 0, 'folder')} and{' '}
                {countLabel(pendingImport?.documents.length ?? 0, 'document')}. Importing replaces everything currently
                in your wallet.
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPendingImport(null)}
                  className={`${pressable} rounded-4xl bg-muted py-3 text-sm font-semibold text-foreground/80 hover:text-foreground`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className={`${pressable} rounded-4xl bg-destructive py-3 text-sm font-semibold text-white hover:bg-destructive/80`}
                >
                  Import
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.NestedRoot>
    </Drawer.Root>
  )
}
