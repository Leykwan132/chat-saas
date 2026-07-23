import { useState } from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildAvatarEmbedSnippet,
  buildAvatarReactEmbedSnippet,
} from '@/lib/avatarEmbed';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type EmbedFormat = 'html' | 'react';

export function AvatarEmbedCard({ publicKey }: { publicKey: string }) {
  const [format, setFormat] = useState<EmbedFormat>('html');
  const snippets: Record<EmbedFormat, string> = {
    html: buildAvatarEmbedSnippet(publicKey),
    react: buildAvatarReactEmbedSnippet(publicKey),
  };
  const snippet = snippets[format];
  const formatLabel = format === 'html' ? 'HTML' : 'React';

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success(`${formatLabel} code copied`);
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
      <div className="space-y-2">
        <Tabs
          value={format}
          onValueChange={(value) => setFormat(value as EmbedFormat)}
        >
          <TabsList aria-label="Embed code format">
            <TabsTrigger value="html">HTML</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <pre className="max-h-56 overflow-auto rounded-lg bg-muted p-3 pr-12 text-xs whitespace-pre-wrap break-all">
            {snippet}
          </pre>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            aria-label={`Copy ${formatLabel} code`}
            title={`Copy ${formatLabel} code`}
            onClick={() => void copySnippet()}
          >
            <Copy />
            <span className="sr-only">{`Copy ${formatLabel} code`}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
