import { useState } from 'react';
import { Film, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useAction, useMutation } from 'convex/react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { uploadWithProgress } from '@/lib/r2Upload';

const MAX_BACKGROUND_BYTES = 50_000_000;
const BACKGROUND_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

export function AvatarBackgroundEditor({
  agentId,
  backgroundUrl,
  backgroundType,
}: {
  agentId: Id<'agents'>;
  backgroundUrl?: string;
  backgroundType?: 'image' | 'video';
}) {
  const generateUploadUrl = useMutation(api.avatarCover.generateBackgroundUploadUrl);
  const saveBackground = useAction(api.avatarCover.saveBackground);
  const removeBackground = useMutation(api.avatarCover.removeBackground);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const selectFile = async (file: File | undefined) => {
    if (!file) return;
    const mimeType = file.type.trim().toLowerCase();
    if (!BACKGROUND_TYPES.has(mimeType)) {
      setError('Backgrounds must be PNG, JPEG, WebP, MP4, or WebM files');
      return;
    }
    if (file.size <= 0 || file.size > MAX_BACKGROUND_BYTES) {
      setError('Backgrounds must be smaller than 50 MB');
      return;
    }
    setUploading(true);
    setError(undefined);
    try {
      const { key, url } = await generateUploadUrl({ agentId, mimeType, fileSize: file.size });
      await uploadWithProgress(url, file);
      await saveBackground({ agentId, key, mimeType });
      toast.success('Avatar background updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not upload background');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    setUploading(true);
    setError(undefined);
    try {
      await removeBackground({ agentId });
      toast.success('Avatar background removed');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove background');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="flex w-fit max-w-full flex-col gap-3 rounded-xl border p-3">
      <Label htmlFor="avatar-background" className="text-base">Background</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative h-20 w-36 overflow-hidden rounded-lg bg-muted">
          {backgroundUrl ? (
            backgroundType === 'video' ? (
              <video src={backgroundUrl} autoPlay loop muted playsInline className="size-full object-cover" />
            ) : (
              <img src={backgroundUrl} alt="Avatar background" className="size-full object-cover" />
            )
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground"><ImagePlus className="size-6" /></div>
          )}
          {uploading ? <div className="absolute inset-0 flex items-center justify-center bg-background/65"><Loader2 className="size-6 animate-spin" /></div> : null}
        </div>
        <div className="flex items-center gap-2">
          <label data-disabled={uploading} className="inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50">
            <input
              id="avatar-background"
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                void selectFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            {uploading ? <Spinner className="mr-2" /> : backgroundType === 'video' ? <Film className="mr-2 size-4" /> : null}
            {backgroundUrl ? 'Replace background' : 'Choose background'}
          </label>
          {backgroundUrl ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Remove background" disabled={uploading} onClick={() => void remove()}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
