import { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { uploadWithProgress } from '@/lib/r2Upload';

const MAX_COVER_IMAGE_BYTES = 5_000_000;
const MAX_COVER_VIDEO_BYTES = 50_000_000;
const COVER_MEDIA_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

export function AvatarCoverImageEditor({
  agentId,
  coverImageUrl,
  coverImageType,
}: {
  agentId: Id<'agents'>;
  coverImageUrl?: string;
  coverImageType?: 'image' | 'video';
}) {
  const generateUploadUrl = useMutation(api.avatarCover.generateCoverUploadUrl);
  const saveCoverImage = useAction(api.avatarCover.saveCoverImage);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const selectFile = async (file: File | undefined) => {
    if (!file) return;
    const mimeType = file.type.trim().toLowerCase();
    const isVideo = mimeType.startsWith('video/');
    if (!COVER_MEDIA_TYPES.has(mimeType)) {
      setError('Cover media must be PNG, JPEG, WebP, MP4, or WebM files');
      return;
    }
    const maxBytes = isVideo ? MAX_COVER_VIDEO_BYTES : MAX_COVER_IMAGE_BYTES;
    if (file.size <= 0 || file.size > maxBytes) {
      setError(isVideo ? 'Cover videos must be smaller than 50 MB' : 'Cover images must be smaller than 5 MB');
      return;
    }
    setUploading(true);
    setError(undefined);
    try {
      const { key, url } = await generateUploadUrl({
        agentId,
        mimeType,
        fileSize: file.size,
      });
      await uploadWithProgress(url, file);
      await saveCoverImage({ agentId, key, mimeType });
      toast.success('Avatar cover updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not upload cover image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="flex w-full flex-col gap-2">
      <Label htmlFor="avatar-cover-image" className="text-base">Cover image</Label>
      <label
        htmlFor="avatar-cover-image"
        data-disabled={uploading}
        className="group relative flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-muted transition-colors hover:border-foreground/50 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60"
      >
        <input
          id="avatar-cover-image"
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => {
            void selectFile(event.currentTarget.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        {coverImageUrl ? (
          coverImageType === 'video'
            ? <video src={coverImageUrl} autoPlay loop muted playsInline aria-label="Avatar cover video" className="size-full object-cover" />
            : <img src={coverImageUrl} alt="Avatar cover" className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus className="size-7" />
            <span className="text-sm font-medium">Upload cover image or video</span>
          </div>
        )}
        {coverImageUrl && !uploading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            Click to replace
          </div>
        ) : null}
        {uploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/65">
            <Spinner className="size-6" />
            <span className="text-xs font-medium">Uploading…</span>
          </div>
        ) : null}
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
