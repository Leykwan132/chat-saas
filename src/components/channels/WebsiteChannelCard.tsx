import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type WebsiteChannelCardProps = {
  agentId?: string;
  onShowDetails: () => void;
};

export function WebsiteChannelCard({
  agentId,
  onShowDetails,
}: WebsiteChannelCardProps) {
  return (
    <div
      className={cn(
        'group relative flex size-56 flex-col rounded-lg border border-border bg-card p-3.5 transition-colors',
        'hover:border-foreground/20 hover:bg-muted/30',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="size-4 shrink-0 text-foreground" />
            <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              Website
            </h3>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Available by default
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 w-full text-[11px]"
          disabled={!agentId}
          onClick={onShowDetails}
        >
          Setup Info
        </Button>
      </div>
    </div>
  );
}
