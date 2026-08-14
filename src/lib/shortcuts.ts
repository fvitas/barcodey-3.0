import { Capacitor } from '@capacitor/core'
import { sortCards, type Card, type SortMode } from '@/lib/model'

export const hasAppShortcuts = Capacitor.isNativePlatform()

export type ShortcutItem = { id: string; title: string; favorite: boolean }

// top 3 of the wall order — favorites pin first via sortCards; iOS menus cap at 4
export function shortcutItems(cards: Card[], sort: SortMode): ShortcutItem[] {
  return sortCards(cards, sort)
    .slice(0, 3)
    .map(card => ({ id: card.id, title: card.name, favorite: card.favorite }))
}

async function plugin() {
  const { AppShortcuts } = await import('@capawesome/capacitor-app-shortcuts')
  return AppShortcuts
}

// full resync — set replaces the whole list, so no diffing needed
export async function syncAppShortcuts(items: ShortcutItem[]): Promise<void> {
  if (!hasAppShortcuts) return
  const AppShortcuts = await plugin()
  if (items.length === 0) {
    await AppShortcuts.clear()
    return
  }
  await AppShortcuts.set({
    shortcuts: items.map(item => ({
      id: item.id,
      title: item.title,
      iosIcon: item.favorite ? 'star.fill' : 'creditcard',
    })),
  })
}

export function onShortcutClick(handler: (cardId: string) => void): () => void {
  if (!hasAppShortcuts) return () => {}
  let remove: (() => void) | null = null
  let cancelled = false

  void plugin().then(async AppShortcuts => {
    const listener = await AppShortcuts.addListener('click', event => {
      handler(event.shortcutId)
    })
    if (cancelled) void listener.remove()
    else remove = () => void listener.remove()
  })

  return () => {
    cancelled = true
    remove?.()
  }
}
