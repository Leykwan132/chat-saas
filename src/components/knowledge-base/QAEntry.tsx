import type { ReactNode } from 'react';

interface QAEntryProps {
  children: ReactNode;
}

export function QAEntry({ children }: QAEntryProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">Add Q&amp;A</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
