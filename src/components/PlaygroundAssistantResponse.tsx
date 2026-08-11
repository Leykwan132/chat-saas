import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PlaygroundAssistantResponseProps = {
  children: ReactNode;
  className?: string;
  expandable: boolean;
  onExpand: () => void;
};

export function PlaygroundAssistantResponse({
  children,
  className,
  expandable,
  onExpand,
}: PlaygroundAssistantResponseProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onExpand();
  };

  return (
    <div
      className={cn(
        className,
        expandable &&
          'cursor-pointer rounded-md outline-none transition hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring',
      )}
      onClick={expandable ? onExpand : undefined}
      onKeyDown={expandable ? handleKeyDown : undefined}
      role={expandable ? 'button' : undefined}
      tabIndex={expandable ? 0 : undefined}
    >
      {children}
    </div>
  );
}
