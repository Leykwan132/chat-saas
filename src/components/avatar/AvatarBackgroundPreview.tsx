import { Button } from '@/components/ui/button';

type PreviewMode = 'cover' | 'background';
type AvatarOrientation = 'landscape' | 'portrait';

export function AvatarBackgroundPreview({
  mode,
  avatarOrientation,
  previewUrl,
  coverImageUrl,
  coverImageType,
  backgroundUrl,
  backgroundType,
}: {
  mode: PreviewMode;
  avatarOrientation: AvatarOrientation;
  previewUrl?: string;
  coverImageUrl?: string;
  coverImageType?: 'image' | 'video';
  backgroundUrl?: string;
  backgroundType?: 'image' | 'video';
}) {
  const displayUrl = mode === 'cover' ? coverImageUrl ?? previewUrl : previewUrl;
  const displayType = mode === 'cover' && coverImageUrl ? coverImageType : 'image';
  const frameClassName = mode === 'background' && avatarOrientation === 'portrait'
    ? 'relative mx-auto h-full max-w-full overflow-hidden aspect-[3/4]'
    : 'absolute inset-0';

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900">
      <div className={frameClassName}>
        {mode === 'background' && backgroundUrl ? (
          backgroundType === 'video' ? (
            <video src={backgroundUrl} autoPlay loop muted playsInline aria-hidden="true" className="absolute inset-0 size-full object-cover" />
          ) : (
            <img src={backgroundUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
          )
        ) : null}
        {displayUrl ? (
          displayType === 'video' ? (
            <video src={displayUrl} autoPlay loop muted playsInline aria-label="Avatar cover video preview" className="absolute inset-0 z-10 size-full object-cover" />
          ) : (
            <img src={displayUrl} alt={mode === 'cover' && coverImageUrl ? 'Avatar cover preview' : 'Avatar preview'} className="absolute inset-0 z-10 size-full object-contain" />
          )
        ) : null}
        {mode === 'background' && (backgroundUrl || displayUrl) ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-zinc-950/40" /> : null}
        {mode === 'cover' && displayUrl ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-zinc-950/40" /> : null}
      </div>
      <Button
        type="button"
        variant="secondary"
        tabIndex={-1}
        className="pointer-events-none absolute bottom-6 left-1/2 z-30 min-h-12 min-w-36 -translate-x-1/2 rounded-4xl border-[6px] border-transparent bg-white bg-clip-padding text-zinc-950 shadow-lg"
        style={{
          background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(to right, #166534, #86efac) border-box',
        }}
      >
        Start Chat
      </Button>
    </div>
  );
}
