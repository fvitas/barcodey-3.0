import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import type { Wallet } from '@/lib/model'

function backupFileName(): string {
  return `barcodey-backup-${new Date().toISOString().slice(0, 10)}.json`
}

async function shareNative(json: string, fileName: string): Promise<void> {
  const { Share } = await import('@capacitor/share')
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
    data: json,
  })

  try {
    await Share.share({ title: 'Barcodey backup', url: uri })
  } catch {
    // user dismissed the share sheet
  } finally {
    await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache }).catch(() => {})
  }
}

function downloadWeb(json: string, fileName: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportBackup(wallet: Wallet): Promise<void> {
  const json = JSON.stringify(wallet, null, 2)
  const fileName = backupFileName()

  if (Capacitor.isNativePlatform()) {
    await shareNative(json, fileName)
  } else {
    downloadWeb(json, fileName)
  }
}
