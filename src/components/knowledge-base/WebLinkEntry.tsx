import type { ReactNode } from 'react';

interface WebLinkEntryProps {
  children: ReactNode;
}

export function WebLinkEntry({ children }: WebLinkEntryProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-foreground">Add website</h2>
      {children}
    </div>
  );
}
