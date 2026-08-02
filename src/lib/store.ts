import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { emptyWallet, walletSchema, type Wallet } from '@/lib/model'

const walletPath = 'wallet.json'
const walletTmpPath = 'wallet.json.tmp'
const walletDirectory = Directory.Data

export type CardStore = {
  load: () => Promise<Wallet>
  save: (wallet: Wallet) => Promise<void>
}

async function readWalletFile(path: string): Promise<Wallet | null> {
  try {
    const result = await Filesystem.readFile({ path, directory: walletDirectory, encoding: Encoding.UTF8 })
    const data: unknown = JSON.parse(result.data as string)
    const parsed = walletSchema.safeParse(data)
    if (!parsed.success) {
      console.error('Wallet file failed validation', parsed.error)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

async function load(): Promise<Wallet> {
  // the tmp file only survives a crash mid-save; it holds the newest complete write
  return (await readWalletFile(walletPath)) ?? (await readWalletFile(walletTmpPath)) ?? emptyWallet
}

async function write(wallet: Wallet): Promise<void> {
  await Filesystem.writeFile({
    path: walletTmpPath,
    directory: walletDirectory,
    encoding: Encoding.UTF8,
    data: JSON.stringify(wallet),
  })

  try {
    await Filesystem.deleteFile({ path: walletPath, directory: walletDirectory })
  } catch {
    // first save — nothing to delete
  }

  await Filesystem.rename({
    from: walletTmpPath,
    to: walletPath,
    directory: walletDirectory,
    toDirectory: walletDirectory,
  })
}

// serialize saves so concurrent mutations never interleave file operations
let saveQueue: Promise<void> = Promise.resolve()

function save(wallet: Wallet): Promise<void> {
  saveQueue = saveQueue
    .catch(() => {})
    .then(() => write(wallet))
  return saveQueue
}

export const cardStore: CardStore = { load, save }
