import { useEffect } from 'react'
import { boostBrightness, restoreBrightness } from '@/lib/brightness'

// max screen brightness while a pass is open — the make-or-break register moment
export function useBrightnessBoost(active: boolean) {
  useEffect(() => {
    if (!active) return
    void boostBrightness()
    return () => {
      void restoreBrightness()
    }
  }, [active])
}
