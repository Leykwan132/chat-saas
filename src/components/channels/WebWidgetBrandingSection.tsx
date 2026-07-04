import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';

type WebWidgetBrandingSectionProps = {
  hidePoweredBy: boolean;
  canHideBranding: boolean;
  saving: boolean;
  onChange: (hidePoweredBy: boolean) => void;
  onRequestUpgrade: () => void;
};

export function WebWidgetBrandingSection({
  hidePoweredBy,
  canHideBranding,
  saving,
  onChange,
  onRequestUpgrade,
}: WebWidgetBrandingSectionProps) {
  const checked = canHideBranding && hidePoweredBy;

  return (
    <Field>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
        <div className="space-y-1">
          <FieldLabel>Branding</FieldLabel>
          <FieldDescription>
            Remove Powered by Kilobot from the website widget.
          </FieldDescription>
        </div>
        <Switch
          checked={checked}
          disabled={saving}
          onCheckedChange={(nextChecked) => {
            if (nextChecked && !canHideBranding) {
              onRequestUpgrade();
              return;
            }
            onChange(nextChecked);
          }}
        />
      </div>
      {!canHideBranding ? (
        <p className="text-xs text-muted-foreground">
          Available on paid plans.
        </p>
      ) : saving ? (
        <p className="text-xs text-muted-foreground">
          Saving branding preference.
        </p>
      ) : null}
    </Field>
  );
}
