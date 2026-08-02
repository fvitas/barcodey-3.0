import { Drawer } from 'vaul'
import { CoverAdjust } from '@/components/CoverAdjust'
import { PhotoField, usePhotoSrc } from '@/components/PhotoField'
import { cardThemeGradients, cardThemes, formatLabels, type Card, type PhotoSide } from '@/lib/model'

type EditDrawerProps = {
  card: Card | null
  onClose: () => void
  onChange: (id: string, patch: Partial<Omit<Card, 'id'>>) => void
}

const coverOptions = ['none', 'front', 'back'] as const

export function EditDrawer({ card, onClose, onChange }: EditDrawerProps) {
  const coverSrc = usePhotoSrc(card?.cover !== undefined ? card.photos[card.cover.side] : undefined)
  return (
    <Drawer.Root open={card !== null} onOpenChange={open => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[26rem] rounded-t-[1.75rem] bg-card outline-none">
          {card && (
            <div className="px-5 pt-3 pb-8">
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-input" />
              <Drawer.Title className="mb-5 text-lg font-extrabold text-foreground">Edit card</Drawer.Title>

              <label className="mb-5 block">
                <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  Name
                </span>
                <input
                  value={card.name}
                  className="w-full rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary"
                  onChange={event => onChange(card.id, { name: event.target.value })}
                />
              </label>

              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                Color
              </span>
              <div className="mb-5 flex gap-2.5">
                {cardThemes.map(theme => (
                  <button
                    key={theme}
                    aria-label={theme}
                    onClick={() => onChange(card.id, { theme })}
                    className={`size-9 rounded-full ${cardThemeGradients[theme]} ${
                      theme === card.theme ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''
                    }`}
                  />
                ))}
              </div>

              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                Photos
              </span>
              <div className="mb-5">
                <PhotoField
                  photos={card.photos}
                  onChange={photos => {
                    // removing the photo used as cover falls back to the gradient face
                    const coverGone = card.cover !== undefined && photos[card.cover.side] === undefined
                    onChange(card.id, coverGone ? { photos, cover: undefined } : { photos })
                  }}
                />
              </div>

              {(card.photos.front !== undefined || card.photos.back !== undefined) && (
                <>
                  <span className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                    Cover
                  </span>
                  <div className={`grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 ${card.cover ? 'mb-4' : 'mb-5'}`}>
                    {coverOptions.map(option => {
                      const selected = option === 'none' ? card.cover === undefined : card.cover?.side === option
                      const disabled = option !== 'none' && card.photos[option as PhotoSide] === undefined
                      return (
                        <button
                          key={option}
                          disabled={disabled}
                          onClick={() =>
                            onChange(card.id, {
                              cover: option === 'none' ? undefined : { side: option, scale: 1, x: 0, y: 0 },
                            })
                          }
                          className={`rounded-lg py-2 text-sm font-semibold capitalize disabled:opacity-40 ${
                            selected ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground'
                          }`}
                        >
                          {option === 'none' ? 'Color' : option}
                        </button>
                      )
                    })}
                  </div>

                  {card.cover !== undefined && coverSrc !== null && (
                    <div className="mb-5">
                      <CoverAdjust
                        src={coverSrc}
                        cover={card.cover}
                        onChange={cover => onChange(card.id, { cover })}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="mb-6 rounded-xl bg-muted/60 px-4 py-3">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
                  {formatLabels[card.format]}
                </p>
                <p className="mt-0.5 font-mono text-sm font-medium tracking-widest text-muted-foreground">
                  {card.value}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25"
              >
                Done
              </button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
