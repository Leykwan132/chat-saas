import { Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkflowMediaKindBadgeProps = {
  kind: 'image' | 'video';
  className?: string;
};

export function WorkflowMediaKindBadge({
  kind,
  className,
}: WorkflowMediaKindBadgeProps) {
  const Icon = kind === 'video' ? Video : ImageIcon;
  return (
    <span
      className={cn(
        'pointer-events-none absolute bottom-1 left-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm',
        className,
      )}
    >
      <Icon className="size-3" />
      <span className="sr-only">{kind === 'video' ? 'Video' : 'Photo'}</span>
    </span>
  );
}
