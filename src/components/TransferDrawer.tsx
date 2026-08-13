import { useEffect, useMemo, useRef, useState } from 'react'
import { Drawer } from 'vaul'
import { CameraScanner } from '@/components/CameraScanner'
import { Switch } from '@/components/ui/switch'
import { warmBarcodeRenderer } from '@/hooks/use-barcode-svg'
import { useBrightnessBoost } from '@/hooks/use-brightness-boost'
import type { Wallet } from '@/lib/model'
import type { ScanResult } from '@/lib/scanner'
import {
  collectFrame,
  createCollector,
  decodeTransfer,
  encodeTransfer,
  isTransferComplete,
  mergeWallet,
  type MergeResult,
} from '@/lib/transfer'
import { pressable } from '@/lib/utils'
import { useWallet } from '@/state/wallet-context'

type TransferDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

type SendScreenProps = {
  open: boolean
  onClose: () => void
  wallet: Wallet
  includeDocuments: boolean
}

function SendScreen({ open, onClose, wallet, includeDocuments }: SendScreenProps) {
  const [frames, setFrames] = useState<string[] | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  useBrightnessBoost(open)

  useEffect(() => {
    if (!open) {
      setFrames(null)
      setFrameIndex(0)
      return
    }
    let cancelled = false
    void Promise.all([warmBarcodeRenderer(), encodeTransfer(wallet, { includeDocuments })]).then(
      ([module, texts]) => {
        if (cancelled) return
        setFrames(texts.map(text => module.renderBarcodeSvg(text, 'qrcode')).filter(svg => svg !== null))
      },
    )
    return () => {
      cancelled = true
    }
  }, [open, wallet, includeDocuments])

  useEffect(() => {
    if (frames === null || frames.length < 2) return
    const timer = window.setInterval(() => setFrameIndex(index => (index + 1) % frames.length), 250)
    return () => window.clearInterval(timer)
  }, [frames])

  const frameHtml = useMemo(
    () => (frames === null || frames.length === 0 ? null : { __html: frames[frameIndex] }),
    [frames, frameIndex],
  )

  return (
    <Drawer.NestedRoot open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <Drawer.Portal>
        {/* always white so the other phone's camera reads it in dark mode too */}
        <Drawer.Content className="fixed inset-0 z-70 rounded-none bg-white outline-none">
          <button onClick={onClose} aria-label="Stop sending" className="flex size-full flex-col items-center justify-center p-8">
            <Drawer.Title asChild>
              <p className="absolute top-14 right-8 left-8 truncate text-center text-base font-extrabold text-slate-900">
                Scan with your other phone
              </p>
            </Drawer.Title>

            {frameHtml !== null ? (
              <div className="w-full max-w-[68vmin] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={frameHtml} />
            ) : (
              <p className="text-sm font-medium text-slate-500">Preparing transfer…</p>
            )}

            <div className="absolute right-8 bottom-14 left-8 flex flex-col gap-1.5 text-center">
              {frames !== null && frames.length > 0 && (
                <p className="font-mono text-sm font-medium tracking-[0.25em] text-slate-500">
                  {frameIndex + 1} / {frames.length}
                </p>
              )}
              <p className="text-xs font-medium text-slate-400">
                Anyone who can see this screen can read your cards · tap to stop
              </p>
            </div>
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.NestedRoot>
  )
}

type ReceiveScreenProps = {
  open: boolean
  onClose: () => void
  onDone: (wallet: Wallet) => void
  wallet: Wallet
}

function ReceiveScreen({ open, onClose, onDone, wallet }: ReceiveScreenProps) {
  const collectorRef = useRef(createCollector())
  const decodingRef = useRef(false)
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null)
  const [pending, setPending] = useState<MergeResult | null>(null)
  const [decodeError, setDecodeError] = useState(false)

  useEffect(() => {
    if (open) return
    collectorRef.current = createCollector()
    decodingRef.current = false
    setProgress(null)
    setPending(null)
    setDecodeError(false)
  }, [open])

  function handleFrame(result: ScanResult) {
    const collector = collectorRef.current
    if (decodingRef.current || !collectFrame(collector, result.value)) return
    setDecodeError(false)
    setProgress({ received: collector.chunks.size, total: collector.total })
    if (!isTransferComplete(collector)) return
    decodingRef.current = true
    void decodeTransfer(collector).then(incoming => {
      if (incoming === null) {
        collectorRef.current = createCollector()
        decodingRef.current = false
        setProgress(null)
        setDecodeError(true)
        return
      }
      setPending(mergeWallet(wallet, incoming))
    })
  }

  function handleConfirm() {
    if (pending === null) return
    onDone(pending.wallet)
  }

  const nothingNew = pending !== null && pending.addedCards + pending.addedFolders + pending.addedDocuments === 0

  return (
    <Drawer.NestedRoot open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-60 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-70 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-1 text-lg font-extrabold text-foreground">Receive cards</Drawer.Title>

            {pending === null ? (
              <>
                <p className="mb-4 text-sm font-medium text-muted-foreground">
                  Point the camera at the animated code on the other phone.
                </p>
                <CameraScanner onDetected={handleFrame} continuous formats={['qrcode']} />
                <p className="text-center font-mono text-sm font-medium tracking-[0.25em] text-muted-foreground">
                  {progress === null ? 'waiting…' : `${progress.received} / ${progress.total}`}
                </p>
                {decodeError && (
                  <p className="mt-2 text-center text-xs font-medium text-destructive">
                    That didn’t decode as a Barcodey transfer — keep both phones steady and try again
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-5 text-sm font-medium text-muted-foreground">
                  {nothingNew
                    ? 'Everything in this transfer is already in your wallet.'
                    : `Adds ${countLabel(pending.addedCards, 'card')}, ${countLabel(pending.addedFolders, 'folder')} and ${countLabel(pending.addedDocuments, 'document')}.`}
                  {pending.skippedCards + pending.skippedDocuments > 0 &&
                    ` Skips ${countLabel(pending.skippedCards + pending.skippedDocuments, 'duplicate')}.`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onClose}
                    className={`${pressable} rounded-4xl bg-muted py-3 text-sm font-semibold text-foreground/80 hover:text-foreground`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={nothingNew}
                    className={`${pressable} rounded-4xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50`}
                  >
                    Add to wallet
                  </button>
                </div>
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.NestedRoot>
  )
}

export function TransferDrawer({ open, onOpenChange, onComplete }: TransferDrawerProps) {
  const { cards, folders, documents, replaceWallet } = useWallet()
  const [includeDocuments, setIncludeDocuments] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)

  const wallet: Wallet = { version: 1, cards, folders, documents }

  function handleReceived(merged: Wallet) {
    replaceWallet(merged)
    setReceiveOpen(false)
    onOpenChange(false)
    onComplete()
  }

  return (
    <Drawer.NestedRoot open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-60 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-1 text-lg font-extrabold text-foreground">Move to another device</Drawer.Title>
            <p className="mb-5 text-sm font-medium text-muted-foreground">
              Show an animated code on this phone and scan it with Barcodey on the other one. Photos stay on this
              device.
            </p>

            <div className="mb-5 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-semibold text-foreground">Include documents</p>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground/80">
                  IDs and licences can hold sensitive numbers
                </p>
              </div>
              <Switch checked={includeDocuments} onCheckedChange={setIncludeDocuments} aria-label="Include documents" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSendOpen(true)}
                className={`${pressable} rounded-4xl bg-primary py-3 text-sm font-semibold text-primary-foreground`}
              >
                Send
              </button>
              <button
                onClick={() => setReceiveOpen(true)}
                className={`${pressable} rounded-4xl bg-muted py-3 text-sm font-semibold text-foreground/80 hover:text-foreground`}
              >
                Receive
              </button>
            </div>
          </div>

          <SendScreen open={sendOpen} onClose={() => setSendOpen(false)} wallet={wallet} includeDocuments={includeDocuments} />
          <ReceiveScreen open={receiveOpen} onClose={() => setReceiveOpen(false)} onDone={handleReceived} wallet={wallet} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.NestedRoot>
  )
}
