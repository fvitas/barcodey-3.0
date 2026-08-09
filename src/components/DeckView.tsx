import { StarIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CoverImage } from '@/components/CoverAdjust'
import { ExpiryPill } from '@/components/ExpiryPill'
import { usePhotoSrc } from '@/components/PhotoField'
import { PassDetails } from '@/components/WallPass'
import { cardThemeGradients, formatLabels, type Card } from '@/lib/model'

type DeckViewProps = {
  cards: Card[]
  expandedCardId: string | null
  resetSignal: string
  initialIndex: number
  canReorder: boolean
  onIndexChange: (index: number) => void
  onReorder: (activeId: string, overId: string) => void
  onToggle: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}

const spacing = 66 // visible top strip of each stacked edge
const bottomPad = 84 // clears the floating nav (60px pill + 16px margin) with an 8px gap
const openRise = 64 // the open card rises out of the stage so its top lines up with the search bar
const openBottomGap = 16
const pilePeek = 16 // visible sliver of the newest passed card at the bottom bezel
const pileStep = 5
const pileMax = 2 // older pile cards fan at most this many steps above the newest
const pileShrink = 0.05 // each fan step narrows so corner arcs nest inside the card in front
const tapSlop = 6
const swipeDistance = 90
const swipeVelocity = 0.5 // px/ms — momentum beats distance
const coastTime = 220 // ms of flick velocity projected into the snap target
const holdDelay = 260 // ms press-and-hold before a card lifts for reorder
const liftEdgeZone = 70 // px from the stage edges where a lifted card auto-scrolls the conveyor
const liftEdgeSpeed = 7 // px/frame at the deepest point of the edge zone

const slotEase = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease-out'
const glideEase = 'cubic-bezier(0.22, 1, 0.36, 1)'

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

function conveyorScale(index: number, soft: number, geo: Geometry): number {
  const raw = geo.frontY - spacing * index + soft
  const depth = (raw - geo.frontY) / spacing
  if (depth < 1) return 1
  return 1 - Math.min(depth - 1, pileMax) * pileShrink
}

function DeckFace({ card, open }: { card: Card; open: boolean }) {
  const coverSrc = usePhotoSrc(card.cover !== undefined ? card.photos[card.cover.side] : undefined)
  const photoFace = card.cover !== undefined && coverSrc !== null

  return (
    <div
      className={`relative flex aspect-[1.586] w-full flex-col justify-between p-4 shadow-lg shadow-slate-900/15 ${cardThemeGradients[card.theme]} ${
        open ? 'rounded-t-2xl' : 'rounded-2xl transition-[border-radius] duration-[450ms] ease-out'
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
        {/* only the top 66px of a stacked card shows, so the badge lives in this row, not a bottom corner */}
        <ExpiryPill expiry={card.expiry} />
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
  escaped: boolean // x-swipes go position:fixed to escape the stage clip and reach the screen edge
  lift: boolean
  liftY: number // the card's translateY at the moment it lifted
  targetIndex: number
}

export function DeckView({
  cards,
  expandedCardId,
  resetSignal,
  initialIndex,
  canReorder,
  onIndexChange,
  onReorder,
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
  const holdTimer = useRef(0)
  const liftRaf = useRef(0)
  const placed = useRef(new Set<string>())
  const arrivals = useRef(new Set<string>())
  const booted = useRef(false)
  const openFixed = useRef<string | null>(null) // card escaped to position:fixed while open
  const unescapeTimer = useRef(0)
  const gesture = useRef<Gesture | null>(null)
  const idsKey = cards.map(card => card.id).join('|')
  const lastReportedIndex = useRef(initialIndex)
  const lastIdsKey = useRef(idsKey)
  const firstResetSignal = useRef(resetSignal)

  const cardsById = new Map(cards.map(card => [card.id, card]))
  const orderedCards = order.map(id => cardsById.get(id)).filter(card => card !== undefined)
  const count = orderedCards.length
  const open = expandedCardId !== null && cardsById.has(expandedCardId)
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

  function applySlot(el: HTMLDivElement, index: number, soft: number, live: boolean, zCap: number) {
    if (geo === null) return
    const raw = geo.frontY - spacing * index + soft
    const y = conveyorY(index, soft, geo)
    const depth = (raw - geo.frontY) / spacing
    el.style.transition = live || reduceMotion ? 'none' : slotEase
    el.style.transform = `translateY(${y}px) scale(${conveyorScale(index, soft, geo)})`
    // stack above: nearer on top; passing/pile: over the front, newest pile card on top — all below the nav (z-30)
    // z is slot-relative, not index-based: absolute indexes tie once they clamp, flipping deep cards' paint order
    if (raw > geo.frontY + 1) {
      el.style.zIndex = String(Math.min(zCap, Math.max(21, 29 - Math.round(depth - 1))))
    } else {
      const slotsAbove = Math.max(0, Math.round((geo.frontY - raw) / spacing))
      el.style.zIndex = String(Math.max(1, 20 - slotsAbove))
    }
    el.style.opacity = '1'
    el.style.pointerEvents = 'auto'
    // big decks: cards fully above the stage or buried under the clamped pile skip paint and
    // give up their compositor layer (will-change) — except mid-flight risers (swipe-to-back)
    const culled = (y < -geo.cardH || depth - 1 > pileMax) && el.dataset.rising === undefined
    el.style.visibility = culled ? 'hidden' : ''
    el.style.willChange = culled ? 'auto' : ''
  }

  // WAAPI movement for the open/close card: CSS transitions silently misfire on the
  // position:fixed flip (engine coalescing), an Animation always runs and is interruption-safe
  function glide(el: HTMLDivElement, write: () => void) {
    const from = getComputedStyle(el).transform
    el.getAnimations?.().forEach(animation => animation.cancel())
    write() // leaves transition 'none' and the final transform in place
    if (reduceMotion || from === 'none') return
    el.animate?.([{ transform: from }, { transform: el.style.transform }], { duration: 450, easing: glideEase })
  }

  function releaseOpenCard(id: string) {
    if (openFixed.current === id) openFixed.current = null
    const el = cardEls.current.get(id)
    if (el === undefined) return
    el.style.position = ''
    el.style.top = ''
    el.style.left = ''
    el.style.width = ''
  }

  function layout(live: boolean) {
    if (geo === null) return
    const soft = softClamp(p.current, maxScroll)
    order.forEach((id, index) => {
      const el = cardEls.current.get(id)
      if (el === undefined) return
      if (open) {
        if (id === expandedCardId) {
          // fixed positioning escapes the stage clip so the card can cover the search bar
          if (openFixed.current !== id && stageRef.current !== null) {
            if (openFixed.current !== null) releaseOpenCard(openFixed.current)
            const rect = stageRef.current.getBoundingClientRect()
            el.style.position = 'fixed'
            el.style.top = `${rect.top}px`
            el.style.left = `${rect.left}px`
            el.style.width = `${rect.width}px`
            openFixed.current = id
          }
          const target = `translateY(${-openRise}px)`
          if (el.style.transform !== target) {
            // a reopen mid-close: stop the panel tuck so framer's enter animation shows
            el.querySelector('[data-deck-panel]')?.getAnimations?.().forEach(animation => animation.cancel())
            glide(el, () => {
              el.style.transition = 'none'
              el.style.transform = target
            })
          }
          el.style.zIndex = '50'
          el.style.opacity = '1'
          el.style.pointerEvents = 'auto'
        } else {
          el.style.transition = live || reduceMotion ? 'none' : slotEase
          el.style.transform = `translateY(${conveyorY(index, soft, geo) - 24}px)`
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
        }
        return
      }
      if (!live && id === openFixed.current) {
        // returning from open: glide home while the panel tucks under the face — both WAAPI,
        // started in one tick; framer's exit starts a frame late, which flickered at the tap
        glide(el, () => applySlot(el, index, soft, true, 29))
        const panel = el.querySelector('[data-deck-panel]')
        if (panel !== null && !reduceMotion) {
          panel.getAnimations?.().forEach(animation => animation.cancel())
          panel.animate?.([{ transform: 'translateY(0px)' }, { transform: 'translateY(-100%)' }], {
            duration: 450,
            easing: glideEase,
          })
        }
        return
      }
      applySlot(el, index, soft, live, 29)
    })
  }

  // while a card is lifted the rest of the deck lays out around a gap at the drop target
  function layoutLift(live: boolean) {
    const active = gesture.current
    if (geo === null || active === null || !active.lift) return
    const soft = softClamp(p.current, maxScroll)
    const rest = orderRef.current.filter(id => id !== active.cardId)
    rest.forEach((id, restIndex) => {
      const el = cardEls.current.get(id)
      if (el === undefined) return
      const displayIndex = restIndex >= active.targetIndex ? restIndex + 1 : restIndex
      applySlot(el, displayIndex, soft, live, 28) // lifted card owns 29
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
    if (index === previous.length - 1) {
      layout(false) // already at the back: reordering is a no-op, snap home instead of sticking mid-fling
      return
    }
    const next = previous.filter(id => id !== cardId)
    next.push(cardId)
    if (index < front) p.current -= spacing // removing a passed card shifts everyone; keep the front where it is
    // the swiped card re-enters from below the screen instead of sliding sideways into the stack
    placed.current.delete(cardId)
    arrivals.current.add(cardId)
    setOrder(next)
  }

  function liftTargetIndex(cardY: number, soft: number): number {
    if (geo === null) return 0
    return Math.max(0, Math.min(count - 1, Math.round((geo.frontY + soft - cardY) / spacing)))
  }

  function liftDragY(active: Gesture, dy: number): number {
    if (dims === null) return active.liftY + dy
    return Math.max(-8, Math.min(dims.height - 40, active.liftY + dy)) // keep the escaped card off the header
  }

  function beginLift(cardId: string) {
    const active = gesture.current
    if (active === null || active.cardId !== cardId || active.moved || geo === null) return
    const index = orderRef.current.indexOf(cardId)
    const el = cardEls.current.get(cardId)
    if (index === -1 || el === undefined) return
    const soft = softClamp(p.current, maxScroll)
    active.lift = true
    active.moved = true // the drop must not count as a tap
    active.liftY = conveyorY(index, soft, geo)
    active.targetIndex = index
    if (stageRef.current !== null) {
      active.escaped = true
      const rect = stageRef.current.getBoundingClientRect()
      el.style.position = 'fixed'
      el.style.top = `${rect.top}px`
      el.style.left = `${rect.left}px`
      el.style.width = `${rect.width}px`
    }
    el.style.transition = reduceMotion ? 'none' : 'transform 0.18s ease-out'
    el.style.transform = `translateY(${active.liftY}px) scale(1.04)`
    el.style.zIndex = '29'
    el.style.boxShadow = '0 24px 48px rgba(15, 23, 42, 0.35)'
    navigator.vibrate?.(10)
    liftRaf.current = requestAnimationFrame(liftTick)
  }

  // holding a lifted card near the stage edges conveys the deck under it
  function liftTick() {
    const active = gesture.current
    const stage = stageRef.current
    if (active === null || !active.lift || geo === null || stage === null) return
    const rect = stage.getBoundingClientRect()
    let delta = 0
    if (active.lastY < rect.top + liftEdgeZone) {
      delta = (1 - (active.lastY - rect.top) / liftEdgeZone) * liftEdgeSpeed
    } else if (active.lastY > rect.bottom - liftEdgeZone) {
      delta = -(1 - (rect.bottom - active.lastY) / liftEdgeZone) * liftEdgeSpeed
    }
    if (delta !== 0) {
      const next = Math.max(0, Math.min(maxScroll, p.current + delta))
      if (next !== p.current) {
        p.current = next
        const soft = softClamp(p.current, maxScroll)
        active.targetIndex = liftTargetIndex(liftDragY(active, active.lastY - active.startY), soft)
        layoutLift(true)
      }
    }
    liftRaf.current = requestAnimationFrame(liftTick)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, cardId: string) {
    if (gesture.current !== null) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
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
      escaped: false,
      lift: false,
      liftY: 0,
      targetIndex: -1,
    }
    if (canReorder && !open && count > 1) {
      clearTimeout(holdTimer.current)
      holdTimer.current = window.setTimeout(() => beginLift(cardId), holdDelay)
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
    if (active.lift) {
      const el = cardEls.current.get(active.cardId)
      if (el !== undefined) {
        const cardY = liftDragY(active, dy)
        el.style.transition = 'none'
        el.style.transform = `translateY(${cardY}px) scale(1.04)`
        const target = liftTargetIndex(cardY, softClamp(p.current, maxScroll))
        if (target !== active.targetIndex) {
          active.targetIndex = target
          layoutLift(false)
        }
      }
      return
    }
    if (!active.moved && (Math.abs(dx) > tapSlop || Math.abs(dy) > tapSlop)) {
      active.moved = true
      active.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
      clearTimeout(holdTimer.current) // real movement before the hold fires means scroll or swipe, not lift
    }
    if (!active.moved || open) return
    if (active.axis === 'x') {
      const index = orderRef.current.indexOf(active.cardId)
      if (index === orderRef.current.length - 1) return // back card: no swipe, nothing behind it to go to
      const el = cardEls.current.get(active.cardId)
      if (el !== undefined && index !== -1) {
        if (!active.escaped && stageRef.current !== null) {
          active.escaped = true
          const rect = stageRef.current.getBoundingClientRect()
          el.style.position = 'fixed'
          el.style.top = `${rect.top}px`
          el.style.left = `${rect.left}px`
          el.style.width = `${rect.width}px`
        }
        el.style.transition = 'none'
        const soft = softClamp(p.current, maxScroll)
        const y = conveyorY(index, soft, geo)
        el.style.transform = `translate(${dx}px, ${y}px) rotate(${dx * 0.05}deg) scale(${conveyorScale(index, soft, geo)})`
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
    clearTimeout(holdTimer.current)
    if (active.lift) {
      cancelAnimationFrame(liftRaf.current)
      const el = cardEls.current.get(active.cardId)
      if (el !== undefined) {
        el.style.boxShadow = ''
        // back to stage coordinates — same visual spot, the slot transition takes it from here
        el.style.position = ''
        el.style.top = ''
        el.style.left = ''
        el.style.width = ''
      }
      const previous = orderRef.current
      const from = previous.indexOf(active.cardId)
      const target = active.targetIndex
      if (cancelled || from === -1 || target === from) {
        snap(0) // edge auto-scroll can leave the conveyor between slots
        return
      }
      p.current = clampSnap(p.current)
      const next = previous.filter(id => id !== active.cardId)
      next.splice(target, 0, active.cardId)
      setOrder(next)
      onReorder(active.cardId, previous[target])
      return
    }
    if (!active.moved) {
      if (cancelled) return
      // taps inside the unfolded details (actions, photos) handle themselves
      if (open && event.target instanceof Element && event.target.closest('button') !== null) return
      onToggle(active.cardId)
      return
    }
    if (open) return
    if (active.axis === 'x') {
      if (active.escaped) {
        const el = cardEls.current.get(active.cardId)
        if (el !== undefined) {
          // back to stage coordinates — same visual spot, the slot transition takes it from here
          el.style.position = ''
          el.style.top = ''
          el.style.left = ''
          el.style.width = ''
        }
      }
      if (!cancelled && (Math.abs(active.dx) > swipeDistance || Math.abs(active.vx) > swipeVelocity)) {
        toBack(active.cardId)
      } else {
        layout(false)
      }
    } else {
      snap(cancelled ? 0 : active.vy)
    }
  }

  // stage size drives all conveyor math; measured synchronously — waiting for the
  // observer's first async delivery paints a frame of unplaced cards on remounts
  useLayoutEffect(() => {
    const stage = stageRef.current
    if (stage === null) return
    const rect = stage.getBoundingClientRect()
    setDims({ width: rect.width, height: rect.height })
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
    // opening a stacked card promotes it: the conveyor advances underneath (the deck is hidden
    // while open) so the card closes into the front slot instead of back into the stack
    if (expandedCardId !== null) {
      const openIndex = order.indexOf(expandedCardId)
      if (openIndex !== -1) p.current = spacing * openIndex
    }
    p.current = Math.max(0, Math.min(maxScroll, p.current))
    const soft = softClamp(p.current, maxScroll)
    order.forEach((id, index) => {
      const el = cardEls.current.get(id)
      if (el === undefined || placed.current.has(id)) return
      el.style.transition = 'none'
      const startY = arrivals.current.has(id) ? dims.height + 30 : conveyorY(index, soft, geo)
      el.style.transform = `translateY(${startY}px) scale(${arrivals.current.has(id) ? 1 : conveyorScale(index, soft, geo)})`
      void el.offsetHeight
    })
    const risers = [...arrivals.current]
    arrivals.current.clear()
    placed.current = new Set(order)
    // first placement snaps into place: fresh elements transition from their default
    // transform (stage top), so an eased pass makes the whole deck fly in on mount;
    // a stage fade stands in as the entrance — deliberately ignores reduced motion
    if (!booted.current) {
      stageRef.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' })
    }
    layout(!booted.current)
    booted.current = true
    // Blink coalesces the pre-place and slot writes into one recalc and skips the transition; WAAPI always runs
    if (!reduceMotion) {
      risers.forEach(id => {
        const el = cardEls.current.get(id)
        if (el === undefined) return
        // un-cull for the rise: the target slot may be off-stage, but the flight is on-screen
        el.dataset.rising = '1'
        el.style.visibility = ''
        el.style.willChange = ''
        const animation = el.animate?.(
          [{ transform: `translateY(${dims.height + 30}px) scale(1)` }, { transform: el.style.transform }],
          { duration: 450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
        )
        // the next layout pass re-culls it once it has settled
        void animation?.finished.then(() => delete el.dataset.rising).catch(() => delete el.dataset.rising)
      })
    }
    reportIndex()
  }, [orderKey, dims, expandedCardId, reduceMotion])

  // on close the card stays fixed through the slide home, then rejoins the stage clip
  useEffect(() => {
    clearTimeout(unescapeTimer.current)
    if (expandedCardId !== null || openFixed.current === null) return
    const id = openFixed.current
    if (reduceMotion) {
      releaseOpenCard(id)
      return
    }
    unescapeTimer.current = window.setTimeout(() => releaseOpenCard(id), 500) // 450ms glide + a buffer
  }, [expandedCardId, reduceMotion])

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
      cancelAnimationFrame(liftRaf.current)
      clearTimeout(wheelIdle.current)
      clearTimeout(holdTimer.current)
      clearTimeout(unescapeTimer.current)
    }
  }, [])

  if (count === 0) return null

  return (
    <div
      ref={stageRef}
      className="relative h-full overflow-hidden rounded-t-2xl"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
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
            className={`absolute top-0 left-0 w-full origin-top select-none will-change-transform [-webkit-touch-callout:none] ${
              isOpen ? 'z-50' : 'cursor-grab touch-none active:cursor-grabbing'
            }`}
          >
            <DeckFace card={card} open={isOpen} />

            <AnimatePresence initial={false}>
              {isOpen && (
                // fixed-height mask; the panel slides under the face with pure transforms, so no
                // per-frame reflow of the barcode subtree (the height fold janked on iOS Safari)
                <motion.div
                  style={
                    geo === null || dims === null
                      ? undefined
                      : { height: Math.max(160, dims.height + openRise - geo.cardH - openBottomGap) }
                  }
                  className="overflow-hidden"
                >
                  <motion.div
                    initial={{ y: '-100%' }}
                    animate={{ y: 0 }}
                    // the WAAPI tuck in layout() paints over this exit; it only delays the unmount
                    exit={{ y: '-100%' }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex h-full flex-col overflow-y-auto overscroll-contain rounded-b-2xl bg-card"
                    data-deck-panel
                  >
                    <PassDetails card={card} stretch onEdit={onEdit} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

    </div>
  )
}
