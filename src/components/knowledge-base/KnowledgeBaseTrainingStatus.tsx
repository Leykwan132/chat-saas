import { Check } from 'lucide-react';

type KnowledgeBaseTrainingStatusProps = {
  trainingItemCount: number;
};

export function KnowledgeBaseTrainingStatus({ trainingItemCount }: KnowledgeBaseTrainingStatusProps) {
  if (trainingItemCount > 0) {
    return (
      <div role="status" aria-live="polite" className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xs font-semibold text-yellow-950">{trainingItemCount}</span>
        <span>training item{trainingItemCount === 1 ? '' : 's'}</span>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600">
        <Check className="size-3.5 text-white" />
      </span>
      <span>Agent is up-to-date</span>
    </div>
  );
}
