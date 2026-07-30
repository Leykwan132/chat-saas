import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Button } from '@/components/ui/button';

type KnowledgeBaseHeaderProps = {
  isTestOpen: boolean;
  onTest: () => void;
};

export function toggleTestOpen(current: boolean) {
  return !current;
}

export function KnowledgeBaseHeader({
  isTestOpen,
  onTest,
}: KnowledgeBaseHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
      <PageTitleBlock
        title="Knowledge Base"
        description="Add the information your agent uses to answer customers."
      />
      <Button
        type="button"
        variant="outline"
        aria-pressed={isTestOpen}
        onClick={onTest}
      >
        Test your agent
      </Button>
    </header>
  );
}
