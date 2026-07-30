import { PageTitleBlock } from '@/components/PageTitleBlock';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type AgentSetupHeaderProps = {
  hasChanges: boolean;
  isPublishing: boolean;
  canPublish: boolean;
  onPublish: () => void;
  onTest: () => void;
};

export function AgentSetupHeader({
  hasChanges,
  isPublishing,
  canPublish,
  onPublish,
  onTest,
}: AgentSetupHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-end">
      <PageTitleBlock
        title="Configuration"
        description="Define how your agent behaves and responds to customers."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onTest}>
          Test your agent
        </Button>
        <Button
          type="button"
          disabled={isPublishing || !hasChanges || !canPublish}
          onClick={onPublish}
          className="px-5"
        >
          {isPublishing ? <Spinner className="size-4" /> : 'Publish'}
        </Button>
      </div>
    </header>
  );
}
