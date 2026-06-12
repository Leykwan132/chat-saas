import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InboxActiveFilter = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type InboxActiveFilterChipsProps = {
  filters: InboxActiveFilter[];
  onRemove: (id: string) => void;
  className?: string;
};

export function InboxActiveFilterChips({
  filters,
  onRemove,
  className,
}: InboxActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {filters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
        >
          {filter.icon ? (
            <span className="flex shrink-0 items-center [&>svg]:size-3">{filter.icon}</span>
          ) : null}
          <span className="truncate">{filter.label}</span>
          <button
            type="button"
            className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
            aria-label={`Remove ${filter.label} filter`}
            onClick={() => onRemove(filter.id)}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
