import { ImageIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { scanImage, type ScanResult } from '@/lib/scanner'
import { pressable } from '@/lib/utils'

type ScanImagePickerProps = {
  onDetected: (result: ScanResult) => void
  compact?: boolean
}

type PickStatus = 'idle' | 'reading' | 'notfound'

export function ScanImagePicker({ onDetected, compact = false }: ScanImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<PickStatus>('idle')

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    setStatus('reading')
    scanImage(file)
      .then(result => {
        if (result === null) {
          setStatus('notfound')
          return
        }
        setStatus('idle')
        onDetected(result)
      })
      .catch(() => setStatus('notfound'))
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === 'reading'}
        className={`${pressable} flex items-center justify-center gap-2 rounded-2xl border-2! border-dashed! border-input! text-muted-foreground hover:text-foreground ${
          compact ? 'py-3 text-sm font-semibold' : 'aspect-video w-full flex-col'
        }`}
      >
        {status === 'notfound' ? (
          compact ? (
            <span className="px-2 text-xs leading-snug font-semibold">No barcode found. Tap to upload new image</span>
          ) : (
            <>
              <span className="text-sm font-semibold">No barcode found.</span>
              <span className="text-xs font-medium">Tap to upload new image</span>
            </>
          )
        ) : (
          <span className={`flex items-center gap-2 ${compact ? '' : 'flex-col'} ${status === 'reading' ? 'animate-pulse' : ''}`}>
            <ImageIcon className={compact ? 'size-4.5' : 'size-6'} />
            <span className="text-sm font-semibold">
              {status === 'reading' ? 'Reading image…' : compact ? 'From image' : 'Choose an image'}
            </span>
          </span>
        )}
      </button>
      {/* image/* in the webview offers Take Photo or Photo Library natively */}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </>
  )
}
