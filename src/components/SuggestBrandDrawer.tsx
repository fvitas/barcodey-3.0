import { ExternalLinkIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Drawer } from 'vaul'
import { Input } from '@/components/ui/input'
import { userCountryName } from '@/lib/brands'
import { suggestBrandUrl } from '@/lib/feedback'
import { pressable } from '@/lib/utils'

type SuggestBrandDrawerProps = {
  open: boolean
  initialName: string
  onClose: () => void
}

export function SuggestBrandDrawer({ open, initialName, onClose }: SuggestBrandDrawerProps) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [color, setColor] = useState('')

  // seed fresh values on every open
  useEffect(() => {
    if (!open) return
    setName(initialName)
    setCountry(userCountryName())
    setColor('')
  }, [open, initialName])

  return (
    <Drawer.NestedRoot open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[90] mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3 pb-8">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-foreground">Suggest a brand</Drawer.Title>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                Brand name
              </span>
              <Input
                value={name}
                placeholder="e.g. Maxi"
                className="h-11 px-4 text-sm font-semibold"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              />
            </label>

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                Country
              </span>
              <Input
                value={country}
                placeholder="Where it operates"
                className="h-11 px-4 text-sm font-semibold"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCountry(event.target.value)}
              />
            </label>

            <label className="mb-6 block">
              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                Brand color · optional
              </span>
              <Input
                value={color}
                placeholder="#0050aa, or just name it"
                className="h-11 px-4 text-sm font-semibold"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setColor(event.target.value)}
              />
            </label>

            <a
              href={suggestBrandUrl({ name, country, color })}
              target="_blank"
              rel="noreferrer"
              className={`${pressable} flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground ${
                name.trim() === '' ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              Continue on GitHub
              <ExternalLinkIcon className="size-4" />
            </a>
            <p className="mt-2.5 text-center text-xs font-medium text-muted-foreground">
              You can attach a logo image on GitHub
            </p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.NestedRoot>
  )
}
