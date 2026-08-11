import type { ReactNode } from 'react';

interface TextKnowledgeEntryProps {
  children: ReactNode;
}

export function TextKnowledgeEntry({ children }: TextKnowledgeEntryProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">Add Text</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
