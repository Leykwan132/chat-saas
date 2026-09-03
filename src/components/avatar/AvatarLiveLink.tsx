import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { buildAvatarLiveUrl } from '@/lib/avatarEmbed';
import { Button } from '@/components/ui/button';

export function AvatarLiveLink({ publicKey }: { publicKey: string }) {
  const url = buildAvatarLiveUrl(publicKey);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Live link copied');
    } catch {
      toast.error('Could not copy live link');
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold">Live link</h2>
          <p className="truncate text-sm text-muted-foreground" title={url}>{url}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()}>
            <Copy data-icon="inline-start" />
            Copy link
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open live link preview"
            title="Open live link preview"
            asChild
          >
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
