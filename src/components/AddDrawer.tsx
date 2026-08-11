import { CameraIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Drawer } from 'vaul'
import { BrandField } from '@/components/BrandField'
import { CameraScanner } from '@/components/CameraScanner'
import { ColorRow } from '@/components/ColorRow'
import { ScanImagePicker } from '@/components/ScanImagePicker'
import { CoverAdjust } from '@/components/CoverAdjust'
import { ExpiryDateField } from '@/components/ExpiryDateField'
import { PhotoField, usePhotoSrc } from '@/components/PhotoField'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { capitalizeFirst, pressable } from '@/lib/utils'
import {
  barcodeFormats,
  findDuplicateCard,
  formatLabels,
  type BarcodeFormat,
  type Card,
  type CardCover,
  type CardPhotos,
  type CardTheme,
  type PhotoSide,
} from '@/lib/model'
import { extractPhotoColor } from '@/lib/photo-color'
import { bakePhotoRotations, deleteCardPhotos } from '@/lib/photos'
import { hasNativeScanner, scanWithNativeScanner, type ScanResult } from '@/lib/scanner'
import { useUiState } from '@/state/ui-state-context'
import { useWallet } from '@/state/wallet-context'

type AddDrawerProps = {
  open: boolean
  onClose: () => void
  onAdd: (card: Card) => void
}

type DuplicateBannerProps = {
  format: BarcodeFormat
  value: string
  name: string
  onView: () => void
  onRescan?: () => void
}

// warn, never block: the form below stays live so adding the twin anyway is just continuing
function DuplicateBanner({ format, value, name, onView, onRescan }: DuplicateBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', duration: 0.5, bounce: 0.35 }}
      className="mb-5 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400">
          Already in your wallet · {formatLabels[format]}
        </p>
        <p className="mt-0.5 truncate font-mono text-sm font-medium tracking-widest text-foreground/80">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
          Saved as <span className="font-semibold text-foreground">{name}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          onClick={onView}
          className={`${pressable} rounded-full px-3 text-xs font-semibold text-amber-700 dark:text-amber-400`}
        >
          View card
        </button>
        {onRescan !== undefined && (
          <button
            onClick={onRescan}
            className={`${pressable} rounded-full px-3 text-xs font-semibold text-muted-foreground`}
          >
            Rescan
          </button>
        )}
      </div>
    </motion.div>
  )
}

export function AddDrawer({ open, onClose, onAdd }: AddDrawerProps) {
  const navigate = useNavigate()
  const { cards } = useWallet()
  const { update } = useUiState()
  const [mode, setMode] = useState<'scan' | 'image' | 'manual'>('scan')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [format, setFormat] = useState<BarcodeFormat>('code128')
  const [theme, setTheme] = useState<CardTheme>('ocean')
  const [color, setColor] = useState<string | undefined>(undefined)
  const [brandId, setBrandId] = useState<string | undefined>(undefined)
  const [brandBg, setBrandBg] = useState<boolean | undefined>(undefined)
  const [photos, setPhotos] = useState<CardPhotos>({})
  const [cover, setCover] = useState<CardCover | undefined>(undefined)
  const [expiry, setExpiry] = useState<string | undefined>(undefined)
  // pending quarter turns keyed by photo path — previewed in the adjuster, baked on save
  const [rotations, setRotations] = useState<Record<string, number>>({})
  // manual dupes warn on first submit; keying by format:value self-invalidates on any edit
  const [warnedKey, setWarnedKey] = useState<string | null>(null)
  const coverPath = cover !== undefined ? photos[cover.side] : undefined
  const coverSrc = usePhotoSrc(coverPath)

  const canSubmit = name.trim() !== '' && (mode === 'manual' ? value.trim() !== '' : scanResult !== null)

  const scannedDuplicate =
    mode !== 'manual' && scanResult !== null
      ? findDuplicateCard(cards, scanResult.value, scanResult.format)
      : undefined
  const manualKey = `${format}:${value.trim()}`
  const manualDuplicate =
    mode === 'manual' && warnedKey === manualKey ? findDuplicateCard(cards, value.trim(), format) : undefined

  function reset() {
    setMode('scan')
    setScanResult(null)
    setName('')
    setValue('')
    setFormat('code128')
    setTheme('ocean')
    setColor(undefined)
    setBrandId(undefined)
    setBrandBg(undefined)
    setPhotos({})
    setCover(undefined)
    setExpiry(undefined)
    setRotations({})
    setWarnedKey(null)
  }

  function handleRotate(path: string) {
    setRotations(current => ({ ...current, [path]: ((current[path] ?? 0) + 1) % 4 }))
  }

  function handlePhotosChange(next: CardPhotos) {
    // removing the photo used as cover falls back to the gradient face
    if (cover !== undefined && next[cover.side] === undefined) setCover(undefined)
    // auto-apply the photo color: the first photo always recolors, later ones only fill a missing color
    const added = (['front', 'back'] as const).find(side => next[side] !== undefined && next[side] !== photos[side])
    const hadNoPhotos = photos.front === undefined && photos.back === undefined
    const addedPath = added !== undefined ? next[added] : undefined
    if (addedPath !== undefined && (hadNoPhotos || color === undefined)) {
      void extractPhotoColor(addedPath).then(hex => hex !== null && setColor(hex))
    }
    setPhotos(next)
  }

  function handleClose() {
    // dismissed without saving — the picked photos would leak as orphan files
    void deleteCardPhotos(photos)
    reset()
    onClose()
  }

  function handleNativeScan() {
    void scanWithNativeScanner()
      .then(result => result !== null && setScanResult(result))
      .catch(() => {})
  }

  function handleViewCard(id: string) {
    handleClose()
    // the notification-tap plumbing: expand + go home works in deck, list, and grid
    update({ expandedCardId: id })
    navigate('/')
  }

  async function handleSubmit() {
    if (!canSubmit) return
    // manual dupes surface at submit; scanned ones already showed the banner at detection
    if (mode === 'manual' && warnedKey !== manualKey && findDuplicateCard(cards, value.trim(), format) !== undefined) {
      setWarnedKey(manualKey)
      return
    }
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      value: mode !== 'manual' && scanResult !== null ? scanResult.value : value.trim(),
      format: mode !== 'manual' && scanResult !== null ? scanResult.format : format,
      theme,
      color,
      brandId,
      brandBg,
      favorite: false,
      addedAt: new Date().toISOString().slice(0, 10),
      folderId: null,
      photos: await bakePhotoRotations(photos, rotations),
      cover,
      expiry,
    })
    reset()
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85dvh] max-w-[26rem] flex-col rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-4 text-lg font-extrabold text-foreground">Add card</Drawer.Title>

            <Tabs value={mode} onValueChange={value => setMode(value as 'scan' | 'image' | 'manual')} className="mb-5">
              <TabsList className="h-11! w-full">
                <TabsTrigger value="scan" className="font-semibold">
                  Scan
                </TabsTrigger>
                <TabsTrigger value="image" className="font-semibold">
                  Image
                </TabsTrigger>
                <TabsTrigger value="manual" className="font-semibold">
                  Manual
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
            {mode === 'scan' && scanResult === null && (
              <div className="mb-5">
                {open && !hasNativeScanner && <CameraScanner onDetected={setScanResult} />}

                {hasNativeScanner && (
                  <button
                    onClick={handleNativeScan}
                    className={`${pressable} flex w-full items-center justify-center gap-2 rounded-4xl bg-foreground py-3 text-sm font-bold text-background`}
                  >
                    <CameraIcon className="size-4.5" />
                    Open scanner
                  </button>
                )}

                {!hasNativeScanner && (
                  <p className="text-center text-xs font-medium text-muted-foreground/80">
                    Point the camera at a barcode — it detects automatically
                  </p>
                )}
              </div>
            )}

            {mode === 'image' && scanResult === null && (
              <div className="mb-5">
                <ScanImagePicker onDetected={setScanResult} />
                <p className="mt-3 text-center text-xs font-medium text-muted-foreground/80">
                  Pick a screenshot or photo with a barcode
                </p>
              </div>
            )}

            {mode !== 'manual' && scanResult !== null && scannedDuplicate !== undefined && (
              <DuplicateBanner
                format={scanResult.format}
                value={scanResult.value}
                name={scannedDuplicate.name}
                onView={() => handleViewCard(scannedDuplicate.id)}
                onRescan={() => setScanResult(null)}
              />
            )}

            {mode !== 'manual' && scanResult !== null && scannedDuplicate === undefined && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', duration: 0.5, bounce: 0.35 }}
                className="mb-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10"
              >
                <div className="min-w-0">
                  <motion.p
                    initial={{ opacity: 0, transform: 'translateY(4px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    transition={{ delay: 0.08, duration: 0.25, ease: 'easeOut' }}
                    className="text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400"
                  >
                    Detected · {formatLabels[scanResult.format]}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, transform: 'translateY(4px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    transition={{ delay: 0.14, duration: 0.25, ease: 'easeOut' }}
                    className="mt-0.5 truncate font-mono text-sm font-medium tracking-widest text-foreground/80"
                  >
                    {scanResult.value}
                  </motion.p>
                </div>
                <button
                  onClick={() => setScanResult(null)}
                  className={`${pressable} shrink-0 rounded-full px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400`}
                >
                  Rescan
                </button>
              </motion.div>
            )}

            {mode === 'manual' && (
              <>
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                    Card number
                  </span>
                  <Input
                    value={value}
                    placeholder="Type or paste the number"
                    className="h-11 px-4 font-mono text-sm font-medium"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
                  />
                </label>

                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Format
                </span>
                <div className="mb-4 flex flex-wrap gap-2">
                  {barcodeFormats.map(option => (
                    <button
                      key={option}
                      onClick={() => setFormat(option)}
                      className={`${pressable} rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                        format === option
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {formatLabels[option]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(mode === 'manual' || scanResult !== null) && (
              <>
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                    Name
                  </span>
                  <Input
                    value={name}
                    placeholder="e.g. Lidl Plus"
                    autoCapitalize="sentences"
                    className="h-11 px-4 text-sm font-semibold"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(capitalizeFirst(event.target.value))}
                  />
                </label>

                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Brand <span className="normal-case">(optional)</span>
                </span>
                <div className="mb-4">
                  <BrandField
                    brandId={brandId}
                    brandBg={brandBg}
                    onPick={brand => {
                      setBrandId(brand.id)
                      setName(brand.name)
                      setColor(brand.color)
                    }}
                    onClear={() => setBrandId(undefined)}
                    onToggleBg={show => setBrandBg(show ? undefined : false)}
                  />
                </div>

                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Color
                </span>
                <div className="mb-4">
                  <ColorRow
                    theme={theme}
                    color={color}
                    photos={photos}
                    onPickTheme={option => {
                      setTheme(option)
                      setColor(undefined)
                    }}
                    onPickColor={setColor}
                  />
                </div>

                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Photos <span className="normal-case">(optional)</span>
                </span>
                <div className="mb-4">
                  <PhotoField photos={photos} onChange={handlePhotosChange} />
                </div>

                {(photos.front !== undefined || photos.back !== undefined) && (
                  <>
                    <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                      Cover
                    </span>
                    <Tabs
                      value={cover?.side ?? 'none'}
                      onValueChange={selected =>
                        setCover(
                          selected === 'none'
                            ? undefined
                            : { side: selected as PhotoSide, scale: 1, x: 0, y: 0 },
                        )
                      }
                      className="mb-4"
                    >
                      <TabsList className="h-11! w-full">
                        {(['none', 'front', 'back'] as const).map(option => (
                          <TabsTrigger
                            key={option}
                            value={option}
                            disabled={option !== 'none' && photos[option] === undefined}
                            className="font-semibold capitalize"
                          >
                            {option === 'none' ? 'Color' : option}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>

                    {cover !== undefined && coverSrc !== null && coverPath !== undefined && (
                      <div className="mb-4">
                        <CoverAdjust
                          src={coverSrc}
                          cover={cover}
                          rotation={rotations[coverPath] ?? 0}
                          onChange={setCover}
                          onRotate={() => handleRotate(coverPath)}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* last field before Save: the 95% of cards that never expire keep a short hot path */}
                <ExpiryDateField value={expiry} onChange={setExpiry} />
              </>
            )}
          </div>

          <div className="px-5 pt-4 pb-5">
            {manualDuplicate !== undefined && (
              <DuplicateBanner
                format={format}
                value={value.trim()}
                name={manualDuplicate.name}
                onView={() => handleViewCard(manualDuplicate.id)}
              />
            )}

            <button
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className={`${pressable} w-full rounded-4xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/80`}
            >
              Add card
            </button>

            <button
              onClick={() => {
                handleClose()
                navigate('/folders/documents')
              }}
              className={`${pressable} mt-4 w-full rounded-4xl py-1 text-center text-xs font-medium text-muted-foreground`}
            >
              Adding an ID or licence? <span className="font-semibold text-primary">Add a document</span>
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
