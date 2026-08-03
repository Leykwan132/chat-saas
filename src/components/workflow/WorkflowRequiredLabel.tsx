import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type WorkflowRequiredLabelProps = {
  as?: 'h4' | 'span';
  children: ReactNode;
  className?: string;
};

export function WorkflowRequiredLabel({
  as: Component = 'span',
  children,
  className,
}: WorkflowRequiredLabelProps) {
  return (
    <Component
      className={cn(
        'inline-flex items-baseline gap-0.5',
        Component === 'h4' && 'text-sm font-semibold text-foreground',
        className,
      )}
    >
      <span>{children}</span>
      <span aria-hidden="true" className="text-destructive">*</span>
      <span className="sr-only"> required</span>
    </Component>
  );
}
