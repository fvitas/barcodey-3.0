import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'
import { ChevronLeftIcon, SearchIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { Input } from '@/components/ui/input'
import {
  brandCategoryLabel,
  brandLogoSrc,
  groupBrandsByLetter,
  loadBrandCatalog,
  searchBrands,
  suggestBrandUrl,
  userCountry,
  type Brand,
} from '@/lib/brands'
import { pressable } from '@/lib/utils'

type BrandPickerProps = {
  open: boolean
  onClose: () => void
  onPick: (brand: Brand) => void
}

type Row = { type: 'header'; letter: string } | { type: 'brand'; brand: Brand }

const headerHeight = 32
const rowHeight = 56

type BrandRowProps = {
  brand: Brand
  onPick: (brand: Brand) => void
}

function BrandRow({ brand, onPick }: BrandRowProps) {
  return (
    <button
      onClick={() => onPick(brand)}
      className={`${pressable} flex h-14 w-full items-center gap-3 px-5 text-left`}
    >
      {/* white chip in both modes — dark wordmarks vanish on dark surfaces */}
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-black/10">
        <img src={brandLogoSrc(brand.id)} alt="" loading="lazy" className="size-[66%] object-contain" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-foreground">{brand.name}</span>
        <span className="block text-xs font-medium text-muted-foreground">{brandCategoryLabel(brand)}</span>
      </span>
    </button>
  )
}

export function BrandPicker({ open, onClose, onPick }: BrandPickerProps) {
  // null while loading — distinct from a failed load
  const [catalog, setCatalog] = useState<Brand[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const country = userCountry()
  // state, not a ref: remounting drawer content re-attaches the virtualizer only via a render
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setFailed(false)
    loadBrandCatalog()
      .then(brands => {
        if (!cancelled) setCatalog(brands)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const searching = query.trim() !== ''
  // memoized: the virtualizer re-renders on every scroll frame
  const rows = useMemo<Row[]>(
    () =>
      searching
        ? searchBrands(catalog ?? [], query, country).map(brand => ({ type: 'brand' as const, brand }))
        : groupBrandsByLetter(catalog ?? []).flatMap(group => [
            { type: 'header' as const, letter: group.letter },
            ...group.brands.map(brand => ({ type: 'brand' as const, brand })),
          ]),
    [searching, catalog, query, country],
  )

  const stickyIndexes = useMemo(() => rows.flatMap((row, index) => (row.type === 'header' ? [index] : [])), [rows])
  const activeStickyRef = useRef(0)

  // TanStack sticky pattern: keep the active group header in range so it can pin
  const rangeExtractor = useCallback(
    (range: Range) => {
      activeStickyRef.current = [...stickyIndexes].reverse().find(index => range.startIndex >= index) ?? 0
      const indexes = new Set([activeStickyRef.current, ...defaultRangeExtractor(range)])
      return [...indexes].sort((a, b) => a - b)
    },
    [stickyIndexes],
  )

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: index => (rows[index].type === 'header' ? headerHeight : rowHeight),
    overscan: 10,
    rangeExtractor: searching ? undefined : rangeExtractor,
  })

  // per-index size caches go stale when the list flips between search and A–Z modes
  useEffect(() => {
    virtualizer.measure()
  }, [searching, virtualizer])

  function handleQueryChange(next: string) {
    setQuery(next)
    scrollEl?.scrollTo({ top: 0 })
  }

  function handlePick(brand: Brand) {
    setQuery('')
    onPick(brand)
  }

  function handleClose() {
    setQuery('')
    onClose()
  }

  return (
    <Drawer.NestedRoot open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex h-[96dvh] max-w-[26rem] flex-col rounded-t-[1.75rem] bg-card outline-none">
          <div className="flex items-center gap-1 px-3 pt-4 pb-2">
            <button
              onClick={handleClose}
              aria-label="Back"
              className={`${pressable} flex size-10 items-center justify-center rounded-full text-primary`}
            >
              <ChevronLeftIcon className="size-6" />
            </button>
            <Drawer.Title className="text-lg font-extrabold text-foreground">Choose brand</Drawer.Title>
          </div>

          <div className="px-5 pb-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                placeholder="Search brands"
                className="h-11 pl-10 text-sm font-semibold"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleQueryChange(event.target.value)}
              />
            </div>
          </div>

          <div ref={setScrollEl} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {failed && (
              <p className="px-5 py-8 text-center text-sm font-medium text-muted-foreground">
                Couldn’t load the brand catalog — close and try again
              </p>
            )}
            {!failed && catalog === null && (
              <p className="px-5 py-8 text-center text-sm font-medium text-muted-foreground">Loading brands…</p>
            )}
            {searching && rows.length === 0 && catalog !== null && (
              <p className="px-5 py-8 text-center text-sm font-medium text-muted-foreground">
                No brands match “{query.trim()}”
              </p>
            )}

            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map(item => {
                const row = rows[item.index]
                const activeSticky = !searching && row.type === 'header' && item.index === activeStickyRef.current
                return (
                  <div
                    key={item.key}
                    className={activeSticky ? 'sticky top-0 z-10 w-full' : 'absolute top-0 left-0 w-full'}
                    style={activeSticky ? { height: item.size } : { height: item.size, transform: `translateY(${item.start}px)` }}
                  >
                    {row.type === 'header' ? (
                      <div className="flex h-8 items-end bg-card px-5 pb-1.5 text-xs font-extrabold tracking-wider text-muted-foreground">
                        {row.letter}
                      </div>
                    ) : (
                      <BrandRow brand={row.brand} onPick={handlePick} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="px-5 pt-3 pb-8">
            <button
              onClick={handleClose}
              className={`${pressable} w-full rounded-xl bg-muted py-3 text-sm font-semibold text-foreground/80 hover:text-foreground`}
            >
              Cancel
            </button>
            <p className="pt-3 text-center text-[0.8125rem] font-medium text-muted-foreground">
              Missing a brand?{' '}
              <a href={suggestBrandUrl(query)} target="_blank" rel="noreferrer" className="font-bold text-primary">
                Suggest it on GitHub ↗
              </a>
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.NestedRoot>
  )
}
