import type { ReactNode } from 'react';

export function PlanSelectionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-title text-center text-4xl font-normal tracking-tight sm:text-5xl">
        Choose your plan
      </h1>
      {children}
    </div>
  );
}
