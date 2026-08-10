import { Check } from 'lucide-react';

type KnowledgeBaseTrainingStatusProps = {
  trainingItemCount: number;
  onTest: () => void;
};

export function KnowledgeBaseTrainingStatus({ trainingItemCount, onTest }: KnowledgeBaseTrainingStatusProps) {
  if (trainingItemCount > 0) {
    return (
      <button type="button" aria-label="Test your agent" onClick={onTest} className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xs font-semibold text-yellow-950">{trainingItemCount}</span>
        <span>training item{trainingItemCount === 1 ? '' : 's'}</span>
      </button>
    );
  }

  return (
    <button type="button" aria-label="Test your agent" onClick={onTest} className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted-foreground/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600">
        <Check className="size-3.5 text-white" />
      </span>
      <span>Agent is up-to-date</span>
    </button>
  );
}
