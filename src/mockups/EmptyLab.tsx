import { CameraIcon, PlusIcon } from 'lucide-react'
import { motion } from 'motion/react'

const miniBars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2]

function MiniBarcode({ height = 'h-6' }: { height?: string }) {
  return (
    <div className={`flex items-stretch gap-[2px] ${height}`}>
      {miniBars.map((width, index) => (
        <div key={index} className="bg-slate-900" style={{ width: `${width}px` }} />
      ))}
    </div>
  )
}

function MiniPass({ gradient, rotate, className = '' }: { gradient: string; rotate: number; className?: string }) {
  return (
    <div
      className={`w-36 overflow-hidden rounded-xl bg-white shadow-lg shadow-slate-900/15 ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className={`h-10 bg-gradient-to-br ${gradient}`} />
      <div className="mx-3 border-t-2 border-dashed border-slate-200" />
      <div className="flex justify-center p-3">
        <MiniBarcode height="h-5" />
      </div>
    </div>
  )
}

function OptionFan() {
  return (
    <div className="relative flex h-44 items-center justify-center">
      <MiniPass gradient="from-emerald-400 to-teal-700" rotate={-12} className="absolute -translate-x-14" />
      <MiniPass gradient="from-orange-400 to-pink-600" rotate={12} className="absolute translate-x-14" />
      <MiniPass gradient="from-sky-400 to-indigo-700" rotate={0} className="relative z-10" />
    </div>
  )
}

function OptionScanPulse() {
  return (
    <div className="relative flex h-44 items-center justify-center">
      <div className="relative w-52 rounded-2xl bg-white p-5 shadow-lg shadow-slate-900/15">
        <div className="flex justify-center">
          <MiniBarcode height="h-12" />
        </div>

        <motion.div
          animate={{ y: [0, 44, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-x-4 top-5 h-0.5 rounded-full bg-blue-500 shadow-[0_0_12px_2px_rgba(59,130,246,0.6)]"
        />

        <span className="absolute -top-2 -left-2 size-6 rounded-tl-lg border-t-4 border-l-4 border-blue-600" />
        <span className="absolute -top-2 -right-2 size-6 rounded-tr-lg border-t-4 border-r-4 border-blue-600" />
        <span className="absolute -bottom-2 -left-2 size-6 rounded-bl-lg border-b-4 border-l-4 border-blue-600" />
        <span className="absolute -right-2 -bottom-2 size-6 rounded-br-lg border-r-4 border-b-4 border-blue-600" />
      </div>
    </div>
  )
}

function OptionPocket() {
  return (
    <div className="relative flex h-44 items-end justify-center overflow-hidden">
      <motion.div
        animate={{ y: [16, 2, 16] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        className="w-44 overflow-hidden rounded-t-xl bg-white shadow-lg shadow-slate-900/15"
      >
        <div className="h-14 bg-gradient-to-br from-sky-400 to-indigo-700 p-3">
          <p className="text-sm font-extrabold text-white">Lidl Plus</p>
        </div>
        <div className="flex justify-center p-3 pb-8">
          <MiniBarcode height="h-5" />
        </div>
      </motion.div>

      <div className="absolute inset-x-10 bottom-0 z-10 h-16 rounded-t-2xl rounded-b-xl bg-slate-800 shadow-inner">
        <div className="mx-auto mt-2.5 h-1 w-16 rounded-full bg-slate-600" />
      </div>
    </div>
  )
}

function OptionRadar() {
  return (
    <div className="relative flex h-44 items-center justify-center">
      <span className="absolute size-36 animate-ping rounded-full bg-blue-500/20 [animation-duration:2.5s]" />
      <span className="absolute size-24 rounded-full bg-blue-500/10" />

      <div className="relative z-10 flex h-36 w-24 flex-col items-center justify-center gap-2 rounded-[1.25rem] border-4 border-slate-900 bg-white shadow-lg">
        <MiniBarcode height="h-8" />
        <p className="font-mono text-[0.5rem] tracking-widest text-slate-400">SCAN ME</p>
      </div>
    </div>
  )
}

function OptionSlots() {
  return (
    <div className="flex h-44 w-56 flex-col justify-center gap-3">
      <div className="h-12 rounded-xl border-2 border-dashed border-slate-300" />

      <div className="flex h-12 items-center justify-center rounded-xl bg-white shadow-md shadow-slate-900/10">
        <motion.span
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white"
        >
          <PlusIcon className="size-4.5" />
        </motion.span>
      </div>

      <div className="h-12 rounded-xl border-2 border-dashed border-slate-300" />
    </div>
  )
}

const options = [
  { id: 'A', name: 'Card fan', Illustration: OptionFan },
  { id: 'B', name: 'Scan pulse', Illustration: OptionScanPulse },
  { id: 'C', name: 'Wallet pocket', Illustration: OptionPocket },
  { id: 'D', name: 'Scan radar', Illustration: OptionRadar },
  { id: 'E', name: 'Waiting slots', Illustration: OptionSlots },
]

export function EmptyLab() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[26rem] bg-slate-100 px-5 pt-8 pb-16">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900">Empty state lab</h1>
      <p className="mb-8 text-sm font-medium text-slate-500">Five illustration options — pick one</p>

      <div className="flex flex-col gap-10">
        {options.map(option => (
          <section key={option.id} className="rounded-3xl bg-white/60 p-5 pb-8 ring-1 ring-slate-200">
            <span className="mb-4 inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
              {option.id} · {option.name}
            </span>

            <div className="flex flex-col items-center">
              <option.Illustration />

              <h2 className="mt-5 mb-1.5 text-xl font-extrabold tracking-tight text-slate-900">
                Your wallet is empty
              </h2>
              <p className="mb-5 text-sm font-medium text-slate-500">
                Scan a loyalty card once and leave the plastic at home.
              </p>

              <button className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30">
                <CameraIcon className="size-4.5" />
                Scan your first card
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
