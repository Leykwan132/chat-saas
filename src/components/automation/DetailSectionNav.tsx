import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

export type DetailSectionTab = {
  id: string;
  label: string;
  icon: ElementType;
  description?: string;
};

type DetailSectionNavProps = {
  tabs: DetailSectionTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

export function DetailSectionNav({
  tabs,
  activeTab,
  onTabChange,
}: DetailSectionNavProps) {
  return (
    <nav className="flex flex-col gap-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] font-medium transition-colors',
                isActive
                  ? 'bg-secondary font-semibold text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </button>
          );
        })}
    </nav>
  );
}

export function DetailSectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      <h2 className="m-0 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
