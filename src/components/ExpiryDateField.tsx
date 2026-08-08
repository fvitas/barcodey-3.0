import { CalendarIcon, XIcon } from 'lucide-react'
import { useRef } from 'react'
import { ExpiryReminderRow } from '@/components/ExpiryReminderRow'
import { Input } from '@/components/ui/input'
import { pressable } from '@/lib/utils'

type ExpiryDateFieldProps = {
  value: string | undefined
  onChange: (expiry: string | undefined) => void
}

export function ExpiryDateField({ value, onChange }: ExpiryDateFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleOpenPicker() {
    const input = inputRef.current
    if (input === null) return
    // the native indicator is hidden to free the slot, so the glyph has to open the picker itself
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.focus()
  }

  return (
    <>
      <div className="mb-4">
        <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
          Expiry date <span className="normal-case">(optional)</span>
        </span>

        <div className="relative">
          {/* ios sizes a date input to its content and centres the value: force it to fill and left-align like Name */}
          <Input
            ref={inputRef}
            type="date"
            value={value ?? ''}
            aria-label="Expiry date"
            className="h-11 appearance-none px-4 pr-12 text-sm font-semibold [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:pl-0.5"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChange(event.target.value === '' ? undefined : event.target.value)
            }
          />

          {/* one slot on the right: the picker glyph while empty, clear once a date is set */}
          {value === undefined ? (
            <button
              onClick={handleOpenPicker}
              aria-label="Pick expiry date"
              className={`${pressable} absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground/70`}
            >
              <CalendarIcon className="size-4" />
            </button>
          ) : (
            <button
              onClick={() => onChange(undefined)}
              aria-label="Clear expiry date"
              className={`${pressable} absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-foreground/10 text-muted-foreground hover:text-foreground`}
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <ExpiryReminderRow expiry={value} />
    </>
  )
}
