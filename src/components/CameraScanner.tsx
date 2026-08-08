import { CameraIcon, SwitchCameraIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { scanImage, type ScanResult } from '@/lib/scanner'

type CameraFacing = 'environment' | 'user'

type CameraScannerProps = {
  onDetected: (result: ScanResult) => void
}

export function CameraScanner({ onDetected }: CameraScannerProps) {
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
      if (busy || cancelled || video.videoWidth === 0 || video.clientHeight === 0) return
      busy = true
      try {
        // decode only what the object-cover preview shows, capped in size — the full sensor
        // frame includes content the user isn't aiming at and made each wasm pass slow
        const viewAspect = video.clientWidth / video.clientHeight
        const cropWidth = Math.min(video.videoWidth, video.videoHeight * viewAspect)
        const cropHeight = Math.min(video.videoHeight, video.videoWidth / viewAspect)
        const scale = Math.min(1, 1_280 / cropWidth)
        context.canvas.width = Math.round(cropWidth * scale)
        context.canvas.height = Math.round(cropHeight * scale)
        context.drawImage(
          video,
          (video.videoWidth - cropWidth) / 2,
          (video.videoHeight - cropHeight) / 2,
          cropWidth,
          cropHeight,
          0,
          0,
          context.canvas.width,
          context.canvas.height,
        )
        const result = await scanImage(context.getImageData(0, 0, context.canvas.width, context.canvas.height))
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
        // ask for 1080p: mobile browsers default to ~640×480, which both looks blurry
        // and leaves too few pixels per bar for the decoder
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1_920 }, height: { ideal: 1_080 } },
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

      // continuous autofocus where the browser exposes it (Android Chrome); iOS does it on its own
      const focusConstraint: MediaTrackConstraintSet & { focusMode?: string } = { focusMode: 'continuous' }
      await stream
        .getVideoTracks()[0]
        ?.applyConstraints({ advanced: [focusConstraint] })
        .catch(() => {})

      // flip only makes sense with a second camera (enumerateDevices needs the granted permission)
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
      const cameras = devices.filter(device => device.kind === 'videoinput')
      if (!cancelled) setCanFlip(cameras.length > 1)

      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (context === null) return
      timer = window.setInterval(() => {
        void captureFrame(video, context)
      }, 200)
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
