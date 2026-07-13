import { Loader2, Save, Trash2 } from 'lucide-react';
import { Panel } from '@xyflow/react';
import { Button } from '@/components/ui/button';

type WorkflowDraftActionsProps = {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
};

export function WorkflowDraftActions({
  isDirty,
  isSaving,
  onSave,
  onReset,
}: WorkflowDraftActionsProps) {
  if (!isDirty) return null;
  return (
    <Panel position="top-right" className="nodrag nopan m-4">
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 backdrop-blur">
        <Button type="button" variant="destructiveGhost" size="sm" disabled={isSaving} onClick={onReset}>
          <Trash2 data-icon="inline-start" />
          Discard changes
        </Button>
        <Button type="button" size="sm" disabled={isSaving} onClick={onSave}>
          {isSaving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          Save
        </Button>
      </div>
    </Panel>
  );
}
