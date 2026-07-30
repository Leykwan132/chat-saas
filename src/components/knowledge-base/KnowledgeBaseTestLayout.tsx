import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type KnowledgeBaseTestLayoutProps = {
  children: ReactNode;
  showTestPanel: boolean;
  testPanel: ReactNode;
};

export function KnowledgeBaseTestLayout({
  children,
  showTestPanel,
  testPanel,
}: KnowledgeBaseTestLayoutProps) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-6',
        showTestPanel && 'xl:grid-cols-[minmax(0,1fr)_380px]',
      )}
    >
      <div className="min-w-0">{children}</div>
      {testPanel}
    </div>
  );
}
