import { StarIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CoverImage } from '@/components/CoverAdjust'
import { usePhotoSrc } from '@/components/PhotoField'
import { PassDetails } from '@/components/WallPass'
import { cardThemeGradients, formatLabels, type Card } from '@/lib/model'

type DeckViewProps = {
  cards: Card[]
  expandedCardId: string | null
  resetSignal: string
  initialIndex: number
  onIndexChange: (index: number) => void
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}

const spacing = 66 // visible top strip of each stacked edge
const topPad = 8
const bottomPad = 84 // clears the floating nav (60px pill + 16px margin) with an 8px gap
const pilePeek = 16 // visible sliver of the newest passed card at the bottom bezel
const pileStep = 5
const pileMax = 2 // older pile cards fan at most this many steps above the newest
const tapSlop = 6
const swipeDistance = 90
const swipeVelocity = 0.5 // px/ms — momentum beats distance
const coastTime = 220 // ms of flick velocity projected into the snap target

const slotEase = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease-out'

type Geometry = { cardH: number; frontY: number; pileBase: number }

function softClamp(value: number, max: number): number {
  if (value < 0) return value * 0.25 // rubber band: the deck follows at a quarter past the ends
  return value > max ? max + (value - max) * 0.25 : value
}

function conveyorY(index: number, soft: number, geo: Geometry): number {
  const raw = geo.frontY - spacing * index + soft
  if (raw <= geo.frontY) return raw
  const depth = (raw - geo.frontY) / spacing // 1 = just passed, 2 = one more ago…
  if (depth >= 1) return geo.pileBase - Math.min(depth - 1, pileMax) * pileStep
  return geo.frontY + (geo.pileBase - geo.frontY) * depth
}

function DeckFace({ card, open }: { card: Card; open: boolean }) {
  const coverSrc = usePhotoSrc(card.cover !== undefined ? card.photos[card.cover.side] : undefined)
  const photoFace = card.cover !== undefined && coverSrc !== null

  return (
    <div
      className={`relative flex aspect-[1.586] w-full flex-col justify-between p-4 ${cardThemeGradients[card.theme]} ${
        open ? 'rounded-t-2xl' : 'rounded-2xl transition-[border-radius] delay-[180ms] duration-150 ease-out'
      }`}
    >
      {photoFace && card.cover !== undefined ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <CoverImage cover={card.cover} src={coverSrc} />
          {/* a stacked edge shows only its top strip, so identity scrim sits at the top */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6),rgba(0,0,0,0.12)_36%,transparent_55%,rgba(0,0,0,0.45))]" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.06)_38%,transparent_39%)]" />
      )}

      <div className="relative flex items-center gap-3">
        {!photoFace && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/25 text-base font-bold text-white">
            {card.name.charAt(0).toUpperCase()}
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-lg leading-tight font-extrabold text-white">{card.name}</p>
        {card.favorite && <StarIcon className="size-4.5 shrink-0 fill-amber-300 stroke-none" />}
      </div>

      <p className="relative text-[0.625rem] font-semibold tracking-[0.2em] text-white/60 uppercase">
        {formatLabels[card.format]} · •••• {card.value.slice(-4)}
      </p>
    </div>
  )
}

type Gesture = {
  cardId: string
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastT: number
  dx: number
  vx: number
  vy: number
  moved: boolean
  axis: 'x' | 'y' | null
}

export function DeckView({
  cards,
  expandedCardId,
  resetSignal,
  initialIndex,
  onIndexChange,
  onToggle,
  onEdit,
  onDelete,
  onToggleFavorite,
}: DeckViewProps) {
  const reduceMotion = useReducedMotion() ?? false
  const [order, setOrder] = useState<string[]>(() => cards.map(card => card.id))
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const cardEls = useRef(new Map<string, HTMLDivElement>())
  const orderRef = useRef(order)
  const p = useRef(spacing * Math.max(0, initialIndex))
  const raf = useRef(0)
  const wheelIdle = useRef(0)
  const placed = useRef(new Set<string>())
  const arrivals = useRef(new Set<string>())
  const gesture = useRef<Gesture | null>(null)
  const lastReportedIndex = useRef(initialIndex)
  const lastIdsKey = useRef(cards.map(card => card.id).join('|'))
  const firstResetSignal = useRef(resetSignal)

  const cardsById = new Map(cards.map(card => [card.id, card]))
  const orderedCards = order.map(id => cardsById.get(id)).filter(card => card !== undefined)
  const count = orderedCards.length
  const open = expandedCardId !== null && cardsById.has(expandedCardId)
  const idsKey = cards.map(card => card.id).join('|')
  const orderKey = order.join('|')

  const geo: Geometry | null =
    dims === null
      ? null
      : {
          cardH: dims.width / 1.586,
          frontY: dims.height - dims.width / 1.586 - bottomPad,
          pileBase: dims.height - pilePeek,
        }
  const maxScroll = spacing * Math.max(0, count - 1)

  function frontIndex(): number {
    return Math.max(0, Math.min(count - 1, Math.round(softClamp(p.current, maxScroll) / spacing)))
  }

  function clampSnap(target: number): number {
    return Math.max(0, Math.min(maxScroll, Math.round(target / spacing) * spacing))
  }

  function layout(live: boolean) {
    if (geo === null) return
    const soft = softClamp(p.current, maxScroll)
    order.forEach((id, index) => {
      const el = cardEls.current.get(id)
      if (el === undefined) return
      el.style.transition = live || reduceMotion ? 'none' : slotEase
      if (open) {
        if (id === expandedCardId) {
          el.style.transform = `translateY(${topPad}px)`
          el.style.zIndex = '50'
          el.style.opacity = '1'
          el.style.pointerEvents = 'auto'
        } else {
          el.style.transform = `translateY(${conveyorY(index, soft, geo) - 24}px)`
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
        }
        return
      }
      const raw = geo.frontY - spacing * index + soft
      el.style.transform = `translateY(${conveyorY(index, soft, geo)}px)`
      // stack above: nearer on top; passing/pile: over the front, newest pile card on top — all below the nav (z-30)
      // z is slot-relative, not index-based: absolute indexes tie once they clamp, flipping deep cards' paint order
      if (raw > geo.frontY + 1) {
        const depth = (raw - geo.frontY) / spacing
        el.style.zIndex = String(Math.min(29, Math.max(21, 29 - Math.round(depth - 1))))
      } else {
        const slotsAbove = Math.max(0, Math.round((geo.frontY - raw) / spacing))
        el.style.zIndex = String(Math.max(1, 20 - slotsAbove))
      }
      el.style.opacity = '1'
      el.style.pointerEvents = 'auto'
    })
  }

  function reportIndex() {
    const front = frontIndex()
    if (front !== lastReportedIndex.current) {
      lastReportedIndex.current = front
      onIndexChange(front)
    }
  }

  function animateP(target: number) {
    cancelAnimationFrame(raf.current)
    const from = p.current
    if (reduceMotion || Math.abs(target - from) < 0.5) {
      p.current = target
      layout(true)
      reportIndex()
      return
    }
    const duration = Math.min(650, 280 + Math.abs(target - from) * 0.5)
    const start = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration)
      p.current = from + (target - from) * (1 - (1 - k) ** 3)
      layout(true)
      if (k < 1) raf.current = requestAnimationFrame(tick)
      else reportIndex()
    }
    raf.current = requestAnimationFrame(tick)
  }

  function snap(velocity: number) {
    animateP(clampSnap(p.current + velocity * coastTime))
  }

  function toBack(cardId: string) {
    const previous = orderRef.current
    if (previous.length < 2) {
      layout(false)
      return
    }
    const index = previous.indexOf(cardId)
    const front = frontIndex()
    if (index === front && front === previous.length - 1) {
      animateP(Math.max(0, p.current - spacing)) // the back card can't go further back: rewind instead
      return
    }
    const next = previous.filter(id => id !== cardId)
    next.push(cardId)
    if (index < front) p.current -= spacing // removing a passed card shifts everyone; keep the front where it is
    setOrder(next)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, cardId: string) {
    if (gesture.current !== null) return
    if (open && cardId !== expandedCardId) return
    cancelAnimationFrame(raf.current)
    clearTimeout(wheelIdle.current)
    gesture.current = {
      cardId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: performance.now(),
      dx: 0,
      vx: 0,
      vy: 0,
      moved: false,
      axis: null,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // the pointer can already be gone on a fast tap-release
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const active = gesture.current
    if (active === null || active.pointerId !== event.pointerId || geo === null) return
    const dx = event.clientX - active.startX
    const dy = event.clientY - active.startY
    const stepY = event.clientY - active.lastY
    const now = performance.now()
    if (now > active.lastT) {
      active.vx = (event.clientX - active.lastX) / (now - active.lastT)
      active.vy = stepY / (now - active.lastT)
    }
    active.lastX = event.clientX
    active.lastY = event.clientY
    active.lastT = now
    active.dx = dx
    if (!active.moved && (Math.abs(dx) > tapSlop || Math.abs(dy) > tapSlop)) {
      active.moved = true
      active.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
    }
    if (!active.moved || open) return
    if (active.axis === 'x') {
      const el = cardEls.current.get(active.cardId)
      const index = orderRef.current.indexOf(active.cardId)
      if (el !== undefined && index !== -1) {
        el.style.transition = 'none'
        const y = conveyorY(index, softClamp(p.current, maxScroll), geo)
        el.style.transform = `translate(${dx}px, ${y}px) rotate(${dx * 0.05}deg)`
      }
    } else {
      p.current += stepY
      layout(true)
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const active = gesture.current
    if (active === null || active.pointerId !== event.pointerId) return
    gesture.current = null
    if (!active.moved) {
      if (cancelled) return
      // taps inside the unfolded details (actions, photos) handle themselves
      if (open && event.target instanceof Element && event.target.closest('button') !== null) return
      onToggle(active.cardId)
      return
    }
    if (open) return
    if (active.axis === 'x') {
      if (!cancelled && (Math.abs(active.dx) > swipeDistance || Math.abs(active.vx) > swipeVelocity)) {
        toBack(active.cardId)
      } else {
        layout(false)
      }
    } else {
      snap(cancelled ? 0 : active.vy)
    }
  }

  // stage size drives all conveyor math
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (stage === null) return
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry !== undefined) {
        setDims({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    orderRef.current = order
  }, [order])

  // reconcile the pipeline-ordered cards prop with the deck's temporary order (R7)
  useEffect(() => {
    if (lastIdsKey.current === idsKey) return
    lastIdsKey.current = idsKey
    const previous = orderRef.current
    const incoming = cards.map(card => card.id)
    const incomingSet = new Set(incoming)
    const previousSet = new Set(previous)
    const survivors = previous.filter(id => incomingSet.has(id))
    const added = incoming.filter(id => !previousSet.has(id))
    const front = Math.max(0, Math.min(survivors.length - 1, Math.round(p.current / spacing)))
    if (added.length > 0) {
      // R12: a new card rises from below into the front slot; everything else shifts up one place
      const next = [...survivors.slice(0, front), ...added, ...survivors.slice(front)]
      arrivals.current = new Set(added)
      setOrder(next)
      return
    }
    if (survivors.length < previous.length) {
      // deletion: the card behind surfaces — keep the front slot where it is
      const removedBeforeFront = previous.filter(
        (id, index) => !incomingSet.has(id) && index < Math.round(p.current / spacing),
      ).length
      p.current = Math.max(0, Math.min(spacing * Math.max(0, survivors.length - 1), p.current - spacing * removedBeforeFront))
      setOrder(survivors)
      return
    }
    // same set, new sequence (e.g. favorite pinning): adopt it but keep the front card in front
    const frontId = previous[front]
    p.current = spacing * Math.max(0, frontId === undefined ? 0 : incoming.indexOf(frontId))
    setOrder(incoming)
  }, [idsKey, cards])

  // sort/search changes reset the conveyor to the first card (locked decision)
  useEffect(() => {
    if (firstResetSignal.current === resetSignal) return
    firstResetSignal.current = resetSignal
    setOrder(cards.map(card => card.id))
    animateP(0)
  }, [resetSignal, cards])

  // place new elements before the animated pass: arrivals below the screen, everything else at its slot
  useLayoutEffect(() => {
    if (geo === null || dims === null) return
    p.current = Math.max(0, Math.min(maxScroll, p.current))
    const soft = softClamp(p.current, maxScroll)
    order.forEach((id, index) => {
      const el = cardEls.current.get(id)
      if (el === undefined || placed.current.has(id)) return
      el.style.transition = 'none'
      const startY = arrivals.current.has(id) ? dims.height + 30 : conveyorY(index, soft, geo)
      el.style.transform = `translateY(${startY}px)`
      void el.offsetHeight
    })
    arrivals.current.clear()
    placed.current = new Set(order)
    layout(false)
    reportIndex()
  }, [orderKey, dims, expandedCardId, reduceMotion])

  // desktop nicety: wheel scrolls the conveyor, snapping on idle
  // no dep array on purpose: the handler needs each render's fresh layout/snap closures
  useEffect(() => {
    const stage = stageRef.current
    if (stage === null) return
    const handleWheel = (event: WheelEvent) => {
      if (orderRef.current.length < 2 || gesture.current !== null) return
      event.preventDefault()
      cancelAnimationFrame(raf.current)
      p.current += -event.deltaY
      layout(true)
      clearTimeout(wheelIdle.current)
      wheelIdle.current = window.setTimeout(() => snap(0), 120)
    }
    if (!open) stage.addEventListener('wheel', handleWheel, { passive: false })
    return () => stage.removeEventListener('wheel', handleWheel)
  })

  useEffect(() => {
    return () => {
      cancelAnimationFrame(raf.current)
      clearTimeout(wheelIdle.current)
    }
  }, [])

  if (count === 0) return null

  return (
    <div
      ref={stageRef}
      className={`relative h-full ${open ? 'overflow-y-auto' : 'overflow-hidden'}`}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => expandedCardId !== null && onToggle(expandedCardId)}
            className="fixed inset-0 z-40 bg-black/40"
          />
        )}
      </AnimatePresence>

      {orderedCards.map(card => {
        const isOpen = card.id === expandedCardId
        return (
          <div
            key={card.id}
            ref={el => {
              if (el !== null) cardEls.current.set(card.id, el)
              else cardEls.current.delete(card.id)
            }}
            role="button"
            aria-label={card.name}
            onPointerDown={(event: React.PointerEvent<HTMLDivElement>) => handlePointerDown(event, card.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={(event: React.PointerEvent<HTMLDivElement>) => handlePointerEnd(event, false)}
            onPointerCancel={(event: React.PointerEvent<HTMLDivElement>) => handlePointerEnd(event, true)}
            className={`absolute top-0 left-0 w-full select-none rounded-2xl bg-card shadow-lg shadow-slate-900/15 will-change-transform ${
              isOpen ? 'z-50' : 'cursor-grab touch-none active:cursor-grabbing'
            }`}
          >
            <DeckFace card={card} open={isOpen} />

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  className="overflow-hidden"
                >
                  <PassDetails card={card} onEdit={onEdit} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

    </div>
  )
}
