import type { ElementType } from 'react';
import { AlignLeft, FileText, Globe, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type KnowledgeType = 'web' | 'file' | 'text' | 'qa';

type KnowledgeTab = {
  type: KnowledgeType;
  label: string;
  icon: ElementType;
};

const KNOWLEDGE_TABS: KnowledgeTab[] = [
  { type: 'web', label: 'Web', icon: Globe },
  { type: 'file', label: 'Files', icon: FileText },
  { type: 'text', label: 'Text', icon: AlignLeft },
  { type: 'qa', label: 'Q&A', icon: HelpCircle },
];

type KnowledgeBaseNavigationProps = {
  activeType: KnowledgeType;
  onSelect: (type: KnowledgeType) => void;
};

function KnowledgeBaseNavGroup({
  title,
  tabs,
  activeType,
  onSelect,
}: {
  title: string;
  tabs: KnowledgeTab[];
  activeType: KnowledgeType;
  onSelect: (type: KnowledgeType) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <nav className="flex flex-col gap-1">
        {tabs.map(({ type, label, icon: Icon }) => {
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
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
    </div>
  );
}

export function KnowledgeBaseNavigation({
  activeType,
  onSelect,
}: KnowledgeBaseNavigationProps) {
  return (
    <div className="flex flex-col gap-8">
      <KnowledgeBaseNavGroup
        title="Sources"
        tabs={KNOWLEDGE_TABS}
        activeType={activeType}
        onSelect={onSelect}
      />
    </div>
  );
}
