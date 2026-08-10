import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Button } from '@/components/ui/button';
import { KnowledgeBaseTrainingStatus } from '@/components/knowledge-base/KnowledgeBaseTrainingStatus';
import type { AgentIndexingStatus } from '@/lib/agentIndexingStatus';

type KnowledgeBaseHeaderProps = {
  isTestOpen: boolean;
  onTest: () => void;
  onOpenTest: () => void;
  indexingStatus: AgentIndexingStatus | null;
  isCheckingStatus: boolean;
};

export function toggleTestOpen(current: boolean) {
  return !current;
}

export function KnowledgeBaseHeader({
  isTestOpen,
  onTest,
  onOpenTest,
  indexingStatus,
  isCheckingStatus,
}: KnowledgeBaseHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <PageTitleBlock
        title="Knowledge Base"
        description="Build your agent’s knowledge here. Your sources are never revealed to users."
      />
      <div className="flex shrink-0 items-center gap-2">
        <KnowledgeBaseTrainingStatus
          indexingStatus={indexingStatus}
          isCheckingStatus={isCheckingStatus}
          onTest={onOpenTest}
        />
        <Button
          type="button"
          variant="outline"
          aria-pressed={isTestOpen}
          onClick={onTest}
        >
          Test your agent
        </Button>
      </div>
    </header>
  );
}
