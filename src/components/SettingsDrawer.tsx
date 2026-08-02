import { useRef } from 'react'
import { Drawer } from 'vaul'
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
    const blob = new Blob([JSON.stringify(wallet, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `barcodey-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
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

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-slate-900">Settings</Drawer.Title>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Appearance
            </span>
            <div className="mb-5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {appearances.map(option => (
                <button
                  key={option}
                  onClick={() => update({ appearance: option })}
                  className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                    state.appearance === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              View
            </span>
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {views.map(option => (
                <button
                  key={option}
                  onClick={() => update({ view: option })}
                  className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                    state.view === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Backup
            </span>
            <div className="mb-6 grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700"
              >
                Export cards
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700"
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

            <p className="text-center text-xs font-medium text-slate-400">Barcodey 3.0</p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
