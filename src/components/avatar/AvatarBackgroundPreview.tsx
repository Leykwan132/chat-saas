import { Button } from '@/components/ui/button';

export function AvatarBackgroundPreview({
  previewUrl,
  coverImageUrl,
  coverImageType,
  backgroundUrl,
  backgroundType,
}: {
  previewUrl?: string;
  coverImageUrl?: string;
  coverImageType?: 'image' | 'video';
  backgroundUrl?: string;
  backgroundType?: 'image' | 'video';
}) {
  const foregroundUrl = coverImageUrl ?? previewUrl;
  const foregroundType = coverImageUrl ? coverImageType : 'image';

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900">
      {backgroundUrl ? (
        backgroundType === 'video' ? (
          <video src={backgroundUrl} autoPlay loop muted playsInline aria-hidden="true" className="absolute inset-0 size-full object-cover" />
        ) : (
          <img src={backgroundUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover" />
        )
      ) : null}
      {foregroundUrl ? (
        foregroundType === 'video' ? (
          <video src={foregroundUrl} autoPlay loop muted playsInline aria-label="Avatar cover video preview" className="absolute inset-0 z-10 size-full object-contain" />
        ) : (
          <img src={foregroundUrl} alt="Avatar cover preview" className="absolute inset-0 z-10 size-full object-contain" />
        )
      ) : null}
      {backgroundUrl || foregroundUrl ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-zinc-950/40" /> : null}
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
