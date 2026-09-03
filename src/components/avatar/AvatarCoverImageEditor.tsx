import { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { uploadWithProgress } from '@/lib/r2Upload';

const MAX_COVER_IMAGE_BYTES = 5_000_000;
const COVER_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function AvatarCoverImageEditor({
  agentId,
  coverImageUrl,
}: {
  agentId: Id<'agents'>;
  coverImageUrl?: string;
}) {
  const generateUploadUrl = useMutation(api.avatarCover.generateCoverUploadUrl);
  const saveCoverImage = useAction(api.avatarCover.saveCoverImage);
  const removeCoverImage = useMutation(api.avatarCover.removeCoverImage);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();

  const selectFile = async (file: File | undefined) => {
    if (!file) return;
    const mimeType = file.type.trim().toLowerCase();
    if (!COVER_IMAGE_TYPES.has(mimeType)) {
      setError('Cover images must be PNG, JPEG, or WebP files');
      return;
    }
    if (file.size <= 0 || file.size > MAX_COVER_IMAGE_BYTES) {
      setError('Cover images must be smaller than 5 MB');
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
      toast.success('Avatar cover image updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not upload cover image');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    setUploading(true);
    setError(undefined);
    try {
      await removeCoverImage({ agentId });
      toast.success('Avatar cover image removed');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove cover image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="flex w-fit max-w-full flex-col gap-3 rounded-xl border p-3">
      <Label htmlFor="avatar-cover-image" className="text-base">Cover image</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative h-20 w-36 overflow-hidden rounded-lg bg-muted">
          {coverImageUrl ? <img src={coverImageUrl} alt="Avatar cover" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><ImagePlus className="size-6" /></div>}
          {uploading ? <div className="absolute inset-0 flex items-center justify-center bg-background/65"><Loader2 className="size-6 animate-spin" /></div> : null}
        </div>
        <div className="flex items-center gap-2">
          <label data-disabled={uploading} className="inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50">
            <input
              id="avatar-cover-image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => {
                void selectFile(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            {uploading ? <Spinner className="mr-2" /> : null}
            {coverImageUrl ? 'Replace cover image' : 'Choose cover image'}
          </label>
          {coverImageUrl ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Remove cover image" disabled={uploading} onClick={() => void remove()}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
