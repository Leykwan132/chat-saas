import type { ReactNode } from 'react';

type SidebarPageTitleRowProps = {
  title: string;
  action?: ReactNode;
};

export function SidebarPageTitleRow({
  title,
  action,
}: SidebarPageTitleRowProps) {
  return (
    <div className="flex items-start justify-between px-4 pb-0 pt-4">
      <h1 className="m-0 font-title text-3xl font-normal tracking-tight text-foreground">
        {title}
      </h1>
      {action}
    </div>
  );
}
