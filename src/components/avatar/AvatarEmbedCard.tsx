import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { buildAvatarEmbedSnippet } from '@/lib/avatarEmbed';
import { Button } from '@/components/ui/button';

export function AvatarEmbedCard({ publicKey }: { publicKey: string }) {
  const snippet = buildAvatarEmbedSnippet(publicKey);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success('Embed code copied');
    } catch {
      toast.error('Could not copy embed code');
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="space-y-1">
        <h2 className="font-semibold">Embed on your website</h2>
        <p className="text-sm text-muted-foreground">
          Paste this iframe into your page to show the complete custom avatar experience.
        </p>
      </div>
      <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">
        {snippet}
      </pre>
      <Button variant="outline" onClick={() => void copySnippet()}>
        <Copy data-icon="inline-start" />
        Copy code
      </Button>
    </section>
  );
}
