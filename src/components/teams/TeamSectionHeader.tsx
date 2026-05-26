import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TeamSectionHeaderProps = {
  title: string;
  actions?: ReactNode;
  className?: string;
};

export function TeamSectionHeader({ title, actions, className }: TeamSectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div> : null}
    </div>
  );
}
