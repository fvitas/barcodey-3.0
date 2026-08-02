import { Drawer } from 'vaul'
import { cardThemeGradients, cardThemes, formatLabels, type Card } from '@/lib/model'

type EditDrawerProps = {
  card: Card | null
  onClose: () => void
  onChange: (id: string, patch: Partial<Omit<Card, 'id'>>) => void
}

export function EditDrawer({ card, onClose, onChange }: EditDrawerProps) {
  return (
    <Drawer.Root open={card !== null} onOpenChange={open => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-white outline-none">
          {card && (
            <div className="px-5 pt-3 pb-8">
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-slate-300" />
              <Drawer.Title className="mb-5 text-lg font-extrabold text-slate-900">Edit card</Drawer.Title>

              <label className="mb-5 block">
                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Name
                </span>
                <input
                  value={card.name}
                  className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  onChange={event => onChange(card.id, { name: event.target.value })}
                />
              </label>

              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                Color
              </span>
              <div className="mb-6 flex gap-2.5">
                {cardThemes.map(theme => (
                  <button
                    key={theme}
                    aria-label={theme}
                    onClick={() => onChange(card.id, { theme })}
                    className={`size-9 rounded-full ${cardThemeGradients[theme]} ${
                      theme === card.theme ? 'ring-2 ring-slate-900 ring-offset-2' : ''
                    }`}
                  />
                ))}
              </div>

              <div className="mb-6 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  {formatLabels[card.format]}
                </p>
                <p className="mt-0.5 font-mono text-sm font-medium tracking-widest text-slate-600">
                  {card.value}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25"
              >
                Done
              </button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
