import { Preferences } from '@capacitor/preferences'
import { z } from 'zod'

const uiStateSchema = z.object({
  path: z.string(),
  view: z.enum(['list', 'grid']),
  sort: z.enum(['manual', 'az', 'za', 'newest', 'oldest']),
  expandedCardId: z.string().nullable(),
  appearance: z.enum(['light', 'dark', 'system']),
  lockDocuments: z.boolean().default(true), // default keeps pre-lock persisted state valid, secure by default
})

export type UiState = z.infer<typeof uiStateSchema>

export const defaultUiState: UiState = {
  path: '/',
  view: 'list',
  sort: 'manual',
  expandedCardId: null,
  appearance: 'system',
  lockDocuments: true,
}

const uiStateKey = 'ui-state'

export async function loadUiState(): Promise<UiState> {
  try {
    const { value } = await Preferences.get({ key: uiStateKey })
    if (value === null) return defaultUiState
    const parsed = uiStateSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : defaultUiState
  } catch {
    return defaultUiState
  }
}

export async function saveUiState(state: UiState): Promise<void> {
  await Preferences.set({ key: uiStateKey, value: JSON.stringify(state) })
}
