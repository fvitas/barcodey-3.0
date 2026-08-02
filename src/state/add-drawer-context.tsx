import { createContext, useContext } from 'react'

// opens the global add-card drawer from anywhere (nav plus button, empty-state CTA)
export const AddDrawerContext = createContext<() => void>(() => {})

export function useOpenAddDrawer(): () => void {
  return useContext(AddDrawerContext)
}
