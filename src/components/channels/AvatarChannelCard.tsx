import { Link } from 'react-router';
import { PiUserFocus } from 'react-icons/pi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AvatarChannelCardProps = {
  agentId?: string;
};

export function AvatarChannelCard({ agentId }: AvatarChannelCardProps) {
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
            <PiUserFocus className="size-4 shrink-0 text-foreground" />
            <h3 className="min-w-0 truncate text-sm font-medium text-foreground">
              Avatar
            </h3>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium leading-none text-muted-foreground">
              Beta
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Live face and voice conversations.
          </p>
        </div>

        <div className="mt-auto flex justify-end">
          {agentId ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-6 rounded-md px-2.5 text-[11px] font-medium shadow-none"
            >
              <Link to={`/dashboard/${agentId}/avatar`}>Setup</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 rounded-md px-2.5 text-[11px] font-medium shadow-none"
              disabled
            >
              Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
