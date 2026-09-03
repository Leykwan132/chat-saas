import { ScanFace } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AvatarPreviewMedia({
  previewUrl,
  previewType = 'image',
  className,
}: {
  previewUrl?: string;
  previewType?: 'image' | 'video';
  className?: string;
}) {
  return (
    <div className={cn('flex aspect-video items-center justify-center overflow-hidden bg-zinc-900', className)}>
      {previewUrl
        ? previewType === 'video'
          ? <video src={previewUrl} autoPlay loop muted playsInline aria-hidden="true" className="size-full object-contain" />
          : <img src={previewUrl} alt="" className="size-full object-contain" />
        : <ScanFace className="size-8 text-zinc-400" />}
    </div>
  );
}
