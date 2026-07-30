import type { ElementType } from 'react';
import { Link } from 'react-router';
import { AlignLeft, ArrowRight, FileText, Globe, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  workflowHref: string;
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
  workflowHref,
}: KnowledgeBaseNavigationProps) {
  return (
    <div className="flex flex-col gap-8">
      <KnowledgeBaseNavGroup
        title="Sources"
        tabs={KNOWLEDGE_TABS}
        activeType={activeType}
        onSelect={onSelect}
      />
      <aside className="overflow-hidden rounded-xl border border-border bg-muted/40">
        <img
          src="https://storage.kilobot.app/workflow-prev.png"
          alt=""
          className="aspect-video w-full object-cover"
        />
        <div className="p-4">
          <p className="text-sm font-semibold leading-snug text-foreground">
            Do More Automatically
          </p>
          <p className="mt-1.5 text-sm font-normal leading-snug text-foreground">
            Need your AI agent to send images, videos, reminders, or follow-ups?
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 w-full">
            <Link to={workflowHref} className="text-sm font-normal leading-snug text-foreground">
              Try Workflow
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}
