import { CheckIcon, PlusIcon, XIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BrandPicker } from '@/components/BrandPicker'
import { cardColorGradient } from '@/lib/color'
import { brandLogoSrc, loadBrandCatalog, type Brand } from '@/lib/brands'
import { pressable } from '@/lib/utils'

type BrandFieldProps = {
  brandId: string | undefined
  brandBg: boolean | undefined
  onPick: (brand: Brand) => void
  onClear: () => void
  onToggleBg: (show: boolean) => void
}

// the card-preview strip: empty = dashed invite, picked = the actual future card face
export function BrandField({ brandId, brandBg, onPick, onClear, onToggleBg }: BrandFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [catalog, setCatalog] = useState<Brand[]>([])

  useEffect(() => {
    let cancelled = false
    loadBrandCatalog()
      .then(brands => {
        if (!cancelled) setCatalog(brands)
      })
      .catch(() => {
        // the picker surfaces load failures
      })
    return () => {
      cancelled = true
    }
  }, [])

  const brand = brandId !== undefined ? catalog.find(entry => entry.id === brandId) : undefined
  const showBg = brandBg !== false

  function handlePick(picked: Brand) {
    setPickerOpen(false)
    onPick(picked)
  }

  return (
    <div>
      {brand === undefined ? (
        <button
          onClick={() => setPickerOpen(true)}
          className={`${pressable} flex w-full items-center gap-2.5 rounded-xl border-2! border-dashed! border-input! px-3.5 py-2.5 text-sm font-semibold text-muted-foreground`}
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <PlusIcon className="size-4" />
          </span>
          Choose brand — logo & color
        </button>
      ) : (
        <>
          <div
            className="relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-origin-border px-3.5 py-2.5"
            style={{ backgroundImage: cardColorGradient(brand.color) }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />
            <button
              onClick={() => setPickerOpen(true)}
              className={`${pressable} relative flex min-w-0 flex-1 items-center gap-3 text-left`}
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center ${
                  showBg ? 'rounded-xl bg-white shadow-sm shadow-black/15' : ''
                }`}
              >
                <img
                  src={brandLogoSrc(brand.id)}
                  alt=""
                  className={
                    showBg
                      ? 'size-[70%] object-contain'
                      : 'size-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                  }
                />
              </span>
              <span className="truncate text-sm font-extrabold text-white">{brand.name}</span>
            </button>
            <button
              onClick={onClear}
              aria-label="Remove brand"
              className={`${pressable} relative flex size-7 shrink-0 items-center justify-center rounded-full bg-white/25 text-white`}
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <button onClick={() => onToggleBg(!showBg)} className={`${pressable} mt-2.5 flex items-center gap-2`}>
            <span
              className={`flex size-4.5 items-center justify-center rounded-[5px] ${
                showBg ? 'bg-primary text-primary-foreground' : 'border-2 border-muted-foreground/50'
              }`}
            >
              {showBg && <CheckIcon className="size-3.5" strokeWidth={3} />}
            </span>
            <span className="text-[0.8125rem] font-semibold text-foreground">Show logo background</span>
          </button>
        </>
      )}

      <BrandPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handlePick} />
    </div>
  )
}
