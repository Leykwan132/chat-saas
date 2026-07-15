import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type TemplateSectionSwitchProps = {
  enabled: boolean;
  label: string;
  onEnabledChange: (enabled: boolean) => void;
};

export function TemplateSectionSwitch({
  enabled,
  label,
  onEnabledChange,
}: TemplateSectionSwitchProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'w-14 text-right text-xs font-medium',
          enabled ? 'text-emerald-600' : 'text-muted-foreground',
        )}
      >
        {enabled ? 'Active' : 'Inactive'}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={onEnabledChange}
        aria-label={`${label} ${enabled ? 'active' : 'inactive'}`}
        className="shrink-0 data-[state=checked]:bg-emerald-600"
      />
    </div>
  );
}
