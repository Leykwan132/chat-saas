import { ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { WorkflowMediaGrid } from './WorkflowMediaGrid';
import type { WorkflowMediaEntry } from './workflowMediaTypes';

type WorkflowLegacyMediaImportProps = {
  entries: WorkflowMediaEntry[];
  isImporting: boolean;
  onImportAll: () => void;
};

export function WorkflowLegacyMediaImport({
  entries,
  isImporting,
  onImportAll,
}: WorkflowLegacyMediaImportProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h5 className="text-sm font-medium text-foreground">Existing media</h5>
          <p className="text-xs text-muted-foreground">
            {entries.length} item{entries.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isImporting}
          onClick={onImportAll}
        >
          {isImporting ? (
            <Spinner className="size-4" />
          ) : (
            <ArchiveRestore data-icon="inline-start" />
          )}
          Import
        </Button>
      </div>
      <WorkflowMediaGrid entries={entries} />
    </div>
  );
}
