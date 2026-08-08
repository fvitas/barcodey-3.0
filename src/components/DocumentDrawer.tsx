import { CameraIcon } from 'lucide-react'
import { useState } from 'react'
import { Drawer } from 'vaul'
import { CameraScanner } from '@/components/CameraScanner'
import { CoverAdjust } from '@/components/CoverAdjust'
import { ExpiryDateField } from '@/components/ExpiryDateField'
import { PhotoField, usePhotoSrc } from '@/components/PhotoField'
import { ScanImagePicker } from '@/components/ScanImagePicker'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatLabels, type Doc, type PhotoSide } from '@/lib/model'
import { bakePhotoRotations, deleteCardPhotos } from '@/lib/photos'
import { hasNativeScanner, scanWithNativeScanner } from '@/lib/scanner'
import { capitalizeFirst, pressable } from '@/lib/utils'

type DocDraft = Pick<Doc, 'name' | 'photos' | 'cover' | 'number' | 'expiry' | 'barcode'>

const emptyDraft: DocDraft = { name: '', photos: {} }

type DocumentFieldsProps = {
  value: DocDraft
  rotations: Record<string, number>
  onPatch: (patch: Partial<DocDraft>) => void
  onRotate: (path: string) => void
}

function DocumentFields({ value, rotations, onPatch, onRotate }: DocumentFieldsProps) {
  const [scanning, setScanning] = useState(false)
  const photoSides = (['front', 'back'] as const).filter(side => value.photos[side] !== undefined)
  // the pass face defaults to the first photo; an explicit cover picks side + framing
  const faceSide = value.cover?.side ?? photoSides[0]
  const faceCover = value.cover ?? (faceSide !== undefined ? { side: faceSide, scale: 1, x: 0, y: 0 } : undefined)
  const facePath = faceSide !== undefined ? value.photos[faceSide] : undefined
  const faceSrc = usePhotoSrc(facePath)

  function handlePhotosChange(photos: Doc['photos']) {
    // removing the photo used as cover falls back to the automatic face
    const coverGone = value.cover !== undefined && photos[value.cover.side] === undefined
    onPatch(coverGone ? { photos, cover: undefined } : { photos })
  }

  function handleScan() {
    if (hasNativeScanner) {
      void scanWithNativeScanner()
        .then(result => result !== null && onPatch({ barcode: result }))
        .catch(() => {})
      return
    }
    setScanning(true)
  }

  return (
    <>
      <label className="mb-4 block">
        <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
          Name
        </span>
        <Input
          value={value.name}
          placeholder="e.g. Driving licence"
          autoCapitalize="sentences"
          className="h-11 px-4 text-sm font-semibold"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onPatch({ name: capitalizeFirst(event.target.value) })}
        />
      </label>

      <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
        Photos
      </span>
      <div className="mb-4">
        <PhotoField photos={value.photos} onChange={handlePhotosChange} />
      </div>

      {photoSides.length > 0 && (
        <>
          <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
            Cover
          </span>
          <Tabs
            value={faceSide}
            onValueChange={selected => onPatch({ cover: { side: selected as PhotoSide, scale: 1, x: 0, y: 0 } })}
            className="mb-4"
          >
            <TabsList className="h-11! w-full">
              {(['front', 'back'] as const).map(option => (
                <TabsTrigger
                  key={option}
                  value={option}
                  disabled={value.photos[option] === undefined}
                  className="font-semibold capitalize"
                >
                  {option}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {faceCover !== undefined && faceSrc !== null && facePath !== undefined && (
            <div className="mb-4">
              <CoverAdjust
                src={faceSrc}
                cover={faceCover}
                rotation={rotations[facePath] ?? 0}
                onChange={cover => onPatch({ cover })}
                onRotate={() => onRotate(facePath)}
              />
            </div>
          )}
        </>
      )}

      <label className="mb-4 block">
        <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
          Number <span className="normal-case">(optional)</span>
        </span>
        <Input
          value={value.number ?? ''}
          placeholder="e.g. AB 123456"
          className="h-11 px-4 font-mono text-sm font-medium"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onPatch({ number: event.target.value === '' ? undefined : event.target.value })
          }
        />
      </label>

      <ExpiryDateField value={value.expiry} onChange={expiry => onPatch({ expiry })} />

      <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
        Barcode <span className="normal-case">(optional)</span>
      </span>
      {value.barcode !== undefined ? (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
              {formatLabels[value.barcode.format]}
            </p>
            <p className="mt-0.5 truncate font-mono text-sm font-medium tracking-widest text-muted-foreground">
              {value.barcode.value}
            </p>
          </div>
          <button
            onClick={() => onPatch({ barcode: undefined })}
            className={`${pressable} shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-destructive`}
          >
            Remove
          </button>
        </div>
      ) : scanning ? (
        <div className="mb-6">
          <CameraScanner
            onDetected={result => {
              onPatch({ barcode: result })
              setScanning(false)
            }}
          />
          <button
            onClick={() => setScanning(false)}
            className={`${pressable} w-full rounded-4xl py-2 text-xs font-semibold text-muted-foreground hover:text-foreground`}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            onClick={handleScan}
            className={`${pressable} flex items-center justify-center gap-2 rounded-2xl border-2! border-dashed! border-input! py-3 text-sm font-semibold text-muted-foreground hover:text-foreground`}
          >
            <CameraIcon className="size-4.5" />
            Scan barcode
          </button>
          <ScanImagePicker compact onDetected={result => onPatch({ barcode: result })} />
        </div>
      )}
    </>
  )
}

type AddDocumentDrawerProps = {
  open: boolean
  onClose: () => void
  onAdd: (doc: Doc) => void
}

export function AddDocumentDrawer({ open, onClose, onAdd }: AddDocumentDrawerProps) {
  const [draft, setDraft] = useState<DocDraft>(emptyDraft)
  // pending quarter turns keyed by photo path — previewed in the adjuster, baked on save
  const [rotations, setRotations] = useState<Record<string, number>>({})

  function handlePatch(patch: Partial<DocDraft>) {
    setDraft(current => ({ ...current, ...patch }))
  }

  function handleRotate(path: string) {
    setRotations(current => ({ ...current, [path]: ((current[path] ?? 0) + 1) % 4 }))
  }

  function handleClose() {
    // dismissed without saving — the picked photos would leak as orphan files
    void deleteCardPhotos(draft.photos)
    setDraft(emptyDraft)
    setRotations({})
    onClose()
  }

  async function handleSubmit() {
    if (draft.name.trim() === '') return
    onAdd({
      id: crypto.randomUUID(),
      ...draft,
      photos: await bakePhotoRotations(draft.photos, rotations),
      name: draft.name.trim(),
      addedAt: new Date().toISOString().slice(0, 10),
    })
    setDraft(emptyDraft)
    setRotations({})
    onClose()
  }

  return (
    <Drawer.Root open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-[26rem] flex-col rounded-t-[1.75rem] bg-card outline-none">
          <div className="px-5 pt-3">
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
            <Drawer.Title className="mb-5 text-lg font-extrabold text-foreground">Add document</Drawer.Title>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
            <DocumentFields value={draft} rotations={rotations} onPatch={handlePatch} onRotate={handleRotate} />
          </div>

          <div className="px-5 pt-4 pb-5">
            <button
              onClick={() => void handleSubmit()}
              disabled={draft.name.trim() === ''}
              className={`${pressable} w-full rounded-4xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/80`}
            >
              Add document
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

type EditDocumentDrawerProps = {
  doc: Doc | null
  onClose: () => void
  onChange: (id: string, patch: Partial<Omit<Doc, 'id'>>) => void
}

export function EditDocumentDrawer({ doc, onClose, onChange }: EditDocumentDrawerProps) {
  // pending quarter turns keyed by photo path — the one deferred edit: previewed live, baked on Done/close
  const [rotations, setRotations] = useState<Record<string, number>>({})

  function handleRotate(path: string) {
    setRotations(current => ({ ...current, [path]: ((current[path] ?? 0) + 1) % 4 }))
  }

  function handleClose() {
    if (doc !== null && Object.keys(rotations).length > 0) {
      const { id, photos } = doc
      const pending = rotations
      void bakePhotoRotations(photos, pending).then(baked => {
        if (baked !== photos) onChange(id, { photos: baked })
      })
    }
    setRotations({})
    onClose()
  }

  return (
    <Drawer.Root open={doc !== null} onOpenChange={open => !open && handleClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-[26rem] flex-col rounded-t-[1.75rem] bg-card outline-none">
          {doc && (
            <>
              <div className="px-5 pt-3">
                <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
                <Drawer.Title className="mb-5 text-lg font-extrabold text-foreground">Edit document</Drawer.Title>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
                <DocumentFields
                  value={doc}
                  rotations={rotations}
                  onPatch={patch => onChange(doc.id, patch)}
                  onRotate={handleRotate}
                />
              </div>

              <div className="px-5 pt-4 pb-5">
                <button
                  onClick={handleClose}
                  className={`${pressable} w-full rounded-4xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/80`}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
