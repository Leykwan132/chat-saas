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
    <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <PageTitleBlock
        title="Knowledge Base"
        description="This is something that won’t be sent to the user."
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
