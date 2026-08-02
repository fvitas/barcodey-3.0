import { FolderIcon, PlusIcon, WalletCardsIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useLocation, useNavigate } from 'react-router'

type AppNavProps = {
  onAdd: () => void
}

type TabProps = {
  label: string
  Icon: typeof FolderIcon
  active: boolean
  onSelect: () => void
}

function Tab({ label, Icon, active, onSelect }: TabProps) {
  return (
    <button
      onClick={onSelect}
      aria-label={label}
      className={`relative flex w-16 items-center justify-center rounded-full py-3 ${
        active ? 'text-primary' : 'text-muted-foreground/70'
      }`}
    >
      {active && (
        <motion.span
          layoutId="nav-tab-pill"
          className="absolute inset-0 rounded-full bg-primary/10"
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        />
      )}
      <Icon className="relative size-5.5" />
    </button>
  )
}

export function AppNav({ onAdd }: AppNavProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const onWallet = !location.pathname.startsWith('/folders')

  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center rounded-full bg-card/95 px-2 py-1.5 shadow-xl shadow-slate-900/15 ring-1 ring-foreground/5 backdrop-blur">
      <Tab label="Wallet" Icon={WalletCardsIcon} active={onWallet} onSelect={() => navigate('/')} />

      <button
        onClick={onAdd}
        aria-label="Add card"
        className="relative z-10 mx-2 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30"
      >
        <PlusIcon className="size-6" />
      </button>

      <Tab label="Folders" Icon={FolderIcon} active={!onWallet} onSelect={() => navigate('/folders')} />
    </nav>
  )
}
