import { CameraIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Drawer } from 'vaul'
import { CameraScanner } from '@/components/CameraScanner'
import { CoverAdjust } from '@/components/CoverAdjust'
import { PhotoField, usePhotoSrc } from '@/components/PhotoField'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { pressable } from '@/lib/utils'
import {
  barcodeFormats,
  cardThemeGradients,
  cardThemes,
  formatLabels,
  type BarcodeFormat,
  type Card,
  type CardCover,
  type CardPhotos,
  type CardTheme,
  type PhotoSide,
} from '@/lib/model'
import { deleteCardPhotos } from '@/lib/photos'
import { hasNativeScanner, scanWithNativeScanner, type ScanResult } from '@/lib/scanner'

type AddDrawerProps = {
  open: boolean
  onClose: () => void
  onAdd: (card: Card) => void
}

export function AddDrawer({ open, onClose, onAdd }: AddDrawerProps) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [format, setFormat] = useState<BarcodeFormat>('code128')
  const [theme, setTheme] = useState<CardTheme>('ocean')
  const [photos, setPhotos] = useState<CardPhotos>({})
  const [cover, setCover] = useState<CardCover | undefined>(undefined)
  const coverSrc = usePhotoSrc(cover !== undefined ? photos[cover.side] : undefined)

  const canSubmit = name.trim() !== '' && (mode === 'scan' ? scanResult !== null : value.trim() !== '')

  function reset() {
    setMode('scan')
    setScanResult(null)
    setName('')
    setValue('')
    setFormat('code128')
    setTheme('ocean')
    setPhotos({})
    setCover(undefined)
  }

  function handlePhotosChange(next: CardPhotos) {
    // removing the photo used as cover falls back to the gradient face
    if (cover !== undefined && next[cover.side] === undefined) setCover(undefined)
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

  function handleSubmit() {
    if (!canSubmit) return
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      value: mode === 'scan' && scanResult !== null ? scanResult.value : value.trim(),
      format: mode === 'scan' && scanResult !== null ? scanResult.format : format,
      theme,
      favorite: false,
      addedAt: new Date().toISOString().slice(0, 10),
      folderId: null,
      photos,
      cover,
    })
    reset()
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-4 text-lg font-extrabold text-foreground">Add card</Drawer.Title>

            <Tabs value={mode} onValueChange={value => setMode(value as 'scan' | 'manual')} className="mb-5">
              <TabsList className="h-11! w-full">
                <TabsTrigger value="scan" className="font-semibold">
                  Scan
                </TabsTrigger>
                <TabsTrigger value="manual" className="font-semibold">
                  Manual
                </TabsTrigger>
              </TabsList>
            </Tabs>

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

            {mode === 'scan' && scanResult !== null && (
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
                    className="h-11 px-4 text-sm font-semibold"
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                  />
                </label>

                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Color
                </span>
                <div className="mb-4 flex gap-2.5">
                  {cardThemes.map(option => (
                    <button
                      key={option}
                      aria-label={option}
                      onClick={() => setTheme(option)}
                      className={`${pressable} size-9 rounded-full ${cardThemeGradients[option]} ${
                        option === theme ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''
                      }`}
                    />
                  ))}
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
                      className={cover !== undefined ? 'mb-4' : 'mb-6'}
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

                    {cover !== undefined && coverSrc !== null && (
                      <div className="mb-6">
                        <CoverAdjust src={coverSrc} cover={cover} onChange={setCover} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <button
              onClick={handleSubmit}
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
