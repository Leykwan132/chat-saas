import type { ReactNode } from 'react';

export function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
      {children}
      <span className="text-red-500"> *</span>
    </span>
  );
}

export function OptionalLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{children}</span>
  );
}
