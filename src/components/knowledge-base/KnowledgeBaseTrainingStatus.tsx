import { Check, LoaderCircle } from 'lucide-react';

type KnowledgeBaseTrainingStatusProps = {
  trainingItemCount: number;
};

export function KnowledgeBaseTrainingStatus({ trainingItemCount }: KnowledgeBaseTrainingStatusProps) {
  if (trainingItemCount > 0) {
    return (
      <div role="status" aria-live="polite" className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-900">
        <LoaderCircle className="size-3.5 shrink-0 animate-spin" />
        <span>{trainingItemCount} training item{trainingItemCount === 1 ? '' : 's'}</span>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
      <Check className="size-3.5 shrink-0 text-white" />
      <span>Agent is up-to-date</span>
    </div>
  );
}
