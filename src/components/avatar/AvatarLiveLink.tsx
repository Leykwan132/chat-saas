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
      <div className="flex items-center gap-1">
        <h2 className="font-semibold">Live link</h2>
        <Button
          type="button"
          variant="ghost"
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
      <div className="relative">
        <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 pr-12 text-xs whitespace-pre-wrap break-all" title={url}>{url}</pre>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          aria-label="Copy live link"
          title="Copy live link"
          onClick={() => void copyLink()}
        >
          <Copy />
          <span className="sr-only">Copy live link</span>
        </Button>
      </div>
    </section>
  );
}
