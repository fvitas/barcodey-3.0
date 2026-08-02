import { useRef } from 'react'
import { Drawer } from 'vaul'
import { exportBackup } from '@/lib/backup'
import { walletSchema, type Wallet } from '@/lib/model'
import { useUiState } from '@/state/ui-state-context'
import { useWallet } from '@/state/wallet-context'

type SettingsDrawerProps = {
  open: boolean
  onClose: () => void
}

const appearances = ['light', 'dark', 'system'] as const
const views = ['list', 'grid'] as const

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { cards, folders, replaceWallet } = useWallet()
  const { state, update } = useUiState()
  const importInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const wallet: Wallet = { version: 1, cards, folders }
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
        window.alert('Not a valid Barcodey backup file')
        return
      }
      if (!parsed.success) {
        window.alert('Not a valid Barcodey backup file')
        return
      }
      if (window.confirm('Importing replaces all current cards and folders. Continue?')) {
        replaceWallet(parsed.data)
        onClose()
      }
    })
  }

  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-foreground">Settings</Drawer.Title>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              Appearance
            </span>
            <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {appearances.map(option => (
                <button
                  key={option}
                  onClick={() => update({ appearance: option })}
                  className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                    state.appearance === option
                      ? 'bg-secondary text-secondary-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              View
            </span>
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {views.map(option => (
                <button
                  key={option}
                  onClick={() => update({ view: option })}
                  className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                    state.view === option
                      ? 'bg-secondary text-secondary-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              Backup
            </span>
            <div className="mb-6 grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="rounded-xl bg-muted py-3 text-sm font-semibold text-foreground/80"
              >
                Export cards
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="rounded-xl bg-muted py-3 text-sm font-semibold text-foreground/80"
              >
                Import backup
              </button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFile}
            />

            <p className="text-center text-xs font-medium text-muted-foreground/80">Barcodey 3.0</p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
