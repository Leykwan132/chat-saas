import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type TraditionalWidgetActionsProps = {
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
};

export function TraditionalWidgetActions({
  canSave,
  saving,
  onSave,
}: TraditionalWidgetActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={!canSave || saving} onClick={onSave}>
        {saving ? <Spinner data-icon="inline-start" /> : null}
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </div>
  );
}
