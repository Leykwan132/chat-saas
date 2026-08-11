import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type TraditionalWidgetActionsProps = {
  activating: boolean;
  canActivate: boolean;
  canSave: boolean;
  saving: boolean;
  onActivate: () => void;
  onSave: () => void;
};

export function TraditionalWidgetActions({
  activating,
  canActivate,
  canSave,
  saving,
  onActivate,
  onSave,
}: TraditionalWidgetActionsProps) {
  const busy = activating || saving;

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" disabled={!canSave || busy} onClick={onSave}>
        {saving ? <Spinner data-icon="inline-start" /> : null}
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
      <Button
        type="button"
        variant="outline"
        disabled={!canActivate || busy}
        onClick={onActivate}
      >
        {activating ? <Spinner data-icon="inline-start" /> : null}
        {activating ? 'Activating…' : 'Set as active widget'}
      </Button>
    </div>
  );
}
