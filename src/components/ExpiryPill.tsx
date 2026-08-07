import { ClockIcon, TriangleAlertIcon } from 'lucide-react'
import { expiryBadge } from '@/lib/expiry'

type ExpiryPillProps = {
  expiry: string | undefined
  variant?: 'pill' | 'disc' // grid tiles have no room for words, so they wear the glyph alone
}

// tinted glass over the card gradient: the same material as the monogram, so it reads on all eight themes
const tones = {
  upcoming: 'bg-white/25 inset-ring-white/30',
  expired: 'bg-red-500/35 inset-ring-red-200/55',
}

export function ExpiryPill({ expiry, variant = 'pill' }: ExpiryPillProps) {
  const badge = expiryBadge(expiry, new Date())
  if (badge === null) return null

  const Icon = badge.tone === 'expired' ? TriangleAlertIcon : ClockIcon
  const tone = tones[badge.tone]

  if (variant === 'disc') {
    return (
      <span
        aria-label={badge.label}
        className={`flex size-6.5 shrink-0 items-center justify-center rounded-full text-white inset-ring ${tone}`}
      >
        <Icon className="size-3.5" />
      </span>
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] leading-tight font-bold text-white inset-ring ${tone}`}
    >
      <Icon className="size-3" />
      {badge.label}
    </span>
  )
}
