import { useState } from 'react'
import { brandLogoSrc } from '@/lib/brands'

type BrandMarkProps = {
  name: string
  brandId: string | undefined
  brandBg: boolean | undefined
  className: string // size + monogram text classes from the call site
}

// monogram is the fallback for brandless cards and ids missing from the catalog
export function BrandMark({ name, brandId, brandBg, className }: BrandMarkProps) {
  const [failedId, setFailedId] = useState<string | null>(null)
  const showLogo = brandId !== undefined && brandId !== failedId

  if (!showLogo) {
    return (
      <span className={`flex shrink-0 items-center justify-center rounded-full bg-white/25 font-bold text-white ${className}`}>
        {name.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center ${
        brandBg === false ? '' : 'rounded-xl bg-white shadow-sm shadow-black/15'
      } ${className}`}
    >
      <img
        src={brandLogoSrc(brandId)}
        alt=""
        onError={() => setFailedId(brandId)}
        className={
          brandBg === false
            ? 'size-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
            : 'size-[70%] object-contain'
        }
      />
    </span>
  )
}
