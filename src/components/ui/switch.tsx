import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:ring-3 aria-invalid:ring-destructive/20 shadow-[inset_0_1px_3px_rgba(15,23,42,0.18)] data-[size=default]:h-[26px] data-[size=default]:w-[46px] data-[size=sm]:h-4 data-[size=sm]:w-7 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-checked:shadow-[inset_0_1px_3px_rgba(0,0,0,0.22)] data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-white shadow-[0_3px_8px_rgba(15,23,42,0.28),0_1px_1px_rgba(15,23,42,0.16)] ring-0 transition-transform group-data-[size=default]/switch:size-[22px] group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[22px] group-data-[size=sm]/switch:data-checked:translate-x-[14px] data-unchecked:translate-x-[2px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
