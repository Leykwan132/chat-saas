import type { ElementType } from 'react';
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/components/knowledge-base/helpers';
import { cn } from '@/lib/utils';

export type KnowledgeBaseStorageStat = {
  label: string;
  count: number;
  size: number;
  icon: ElementType;
};

type KnowledgeBaseStoragePanelProps = {
  rows: KnowledgeBaseStorageStat[];
  totalFileSize: number;
  maxTotalSize: number;
  className?: string;
};

export function KnowledgeBaseStoragePanel({
  rows,
  totalFileSize,
  maxTotalSize,
  className,
}: KnowledgeBaseStoragePanelProps) {
  return (
    <aside className={cn('flex min-w-0 flex-col gap-2.5 xl:w-[280px]', className)}>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Storage limit
      </h2>
      <div className="flex w-full flex-col gap-3">
        {rows.map(({ label, count, size, icon: Icon }) => (
          <div
            key={label}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-medium text-foreground">
                {count} {label}
              </span>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {formatFileSize(size)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex w-full flex-col gap-1">
        <span className="text-xs text-muted-foreground">Storage used</span>
        <Progress
          value={Math.min((totalFileSize / maxTotalSize) * 100, 100)}
          className="h-1"
        />
        <div className="flex justify-end text-xs text-muted-foreground tabular-nums">
          {formatFileSize(totalFileSize)} of {formatFileSize(maxTotalSize)}
        </div>
      </div>
    </aside>
  );
}
