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
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-foreground">
          Remove Kilobot branding
        </p>
        <Switch
          checked={checked}
          disabled={saving}
          aria-label="Remove Kilobot branding"
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
    </div>
  );
}
