import { CameraIcon, SwitchCameraIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import {
  barcodeFormats,
  cardThemeGradients,
  cardThemes,
  formatLabels,
  type BarcodeFormat,
  type Card,
  type CardTheme,
} from '@/lib/model'
import { hasNativeScanner, scanImage, scanWithNativeScanner, type ScanResult } from '@/lib/scanner'

type CameraFacing = 'environment' | 'user'

type CameraScannerProps = {
  onDetected: (result: ScanResult) => void
}

function CameraScanner({ onDetected }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectedRef = useRef(onDetected)
  // back camera by default, flip icon switches to front (e.g. scanning a code off another screen)
  const [facing, setFacing] = useState<CameraFacing>('environment')
  const [canFlip, setCanFlip] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let timer = 0
    let busy = false

    async function captureFrame(video: HTMLVideoElement, context: CanvasRenderingContext2D) {
      if (busy || cancelled || video.videoWidth === 0) return
      busy = true
      try {
        context.canvas.width = video.videoWidth
        context.canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        const result = await scanImage(context.getImageData(0, 0, video.videoWidth, video.videoHeight))
        if (result !== null && !cancelled) {
          window.clearInterval(timer)
          onDetectedRef.current(result)
        }
      } finally {
        busy = false
      }
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        })
      } catch {
        if (!cancelled) setError('Camera unavailable — use the Manual tab instead')
        return
      }

      const video = videoRef.current
      if (cancelled || video === null) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      setError(null)
      video.srcObject = stream
      await video.play().catch(() => {})

      // flip only makes sense with a second camera (enumerateDevices needs the granted permission)
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      const cameras = devices.filter(device => device.kind === 'videoinput')
      if (!cancelled) setCanFlip(cameras.length > 1)

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (context === null) return
      timer = window.setInterval(() => {
        void captureFrame(video, context)
      }, 350)
    }

    void start()

    return () => {
      cancelled = true
      window.clearInterval(timer)
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [facing])

  if (error !== null) {
    return (
      <div className="mb-3 flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 text-center">
        <CameraIcon className="size-7 text-white/30" />
        <p className="text-xs font-medium text-white/60">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl bg-slate-900">
      <video ref={videoRef} playsInline muted autoPlay className="aspect-video w-full object-cover" />
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/60" />

      {canFlip && (
        <button
          onClick={() => setFacing(current => (current === 'environment' ? 'user' : 'environment'))}
          aria-label="Flip camera"
          className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
        >
          <SwitchCameraIcon className="size-5" />
        </button>
      )}
    </div>
  )
}

type AddDrawerProps = {
  open: boolean
  onClose: () => void
  onAdd: (card: Card) => void
}

export function AddDrawer({ open, onClose, onAdd }: AddDrawerProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [format, setFormat] = useState<BarcodeFormat>('code128')
  const [theme, setTheme] = useState<CardTheme>('ocean')

  const canSubmit = name.trim() !== '' && (mode === 'scan' ? scanResult !== null : value.trim() !== '')

  function reset() {
    setMode('scan')
    setScanResult(null)
    setName('')
    setValue('')
    setFormat('code128')
    setTheme('ocean')
  }

  function handleClose() {
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
    })
    handleClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-4 text-lg font-extrabold text-foreground">Add card</Drawer.Title>

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {(['scan', 'manual'] as const).map(option => (
                <button
                  key={option}
                  onClick={() => setMode(option)}
                  className={`rounded-lg py-2 text-sm font-semibold capitalize ${
                    mode === option
                      ? 'bg-secondary text-secondary-foreground shadow-sm'
                      : 'text-muted-foreground'
                  }`}
                >
                  {option === 'scan' ? 'Scan' : 'Manual'}
                </button>
              ))}
            </div>

            {mode === 'scan' && scanResult === null && (
              <div className="mb-5">
                {open && !hasNativeScanner && <CameraScanner onDetected={setScanResult} />}

                {hasNativeScanner && (
                  <button
                    onClick={handleNativeScan}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-bold text-background"
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
              <div className="mb-5 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                    Detected · {formatLabels[scanResult.format]}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-sm font-medium tracking-widest text-foreground/80">
                    {scanResult.value}
                  </p>
                </div>
                <button
                  onClick={() => setScanResult(null)}
                  className="shrink-0 pl-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                >
                  Rescan
                </button>
              </div>
            )}

            {mode === 'manual' && (
              <>
                <label className="mb-4 block">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                    Card number
                  </span>
                  <input
                    value={value}
                    placeholder="Type or paste the number"
                    className="w-full rounded-xl bg-muted px-4 py-3 font-mono text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary"
                    onChange={event => setValue(event.target.value)}
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
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                        format === option
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
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
                  <input
                    value={name}
                    placeholder="e.g. Lidl Plus"
                    className="w-full rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary"
                    onChange={event => setName(event.target.value)}
                  />
                </label>

                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Color
                </span>
                <div className="mb-6 flex gap-2.5">
                  {cardThemes.map(option => (
                    <button
                      key={option}
                      aria-label={option}
                      onClick={() => setTheme(option)}
                      className={`size-9 rounded-full ${cardThemeGradients[option]} ${
                        option === theme ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
            >
              Add card
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
