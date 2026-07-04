import {
  Check,
  PanelBottom,
  PanelLeft,
  PanelRight,
  type LucideIcon,
} from 'lucide-react';
import type { WebWidgetLayout } from '../../../shared/webWidgetLayouts';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';

type LayoutOption = {
  value: WebWidgetLayout;
  label: string;
  description: string;
  Icon: LucideIcon;
};

const layoutOptions: LayoutOption[] = [
  {
    value: 'right_avatar',
    label: 'Right avatar',
    description: 'Classic launcher on the lower right.',
    Icon: PanelRight,
  },
  {
    value: 'left_avatar',
    label: 'Left avatar',
    description: 'Launcher anchored on the lower left.',
    Icon: PanelLeft,
  },
  {
    value: 'input_bar',
    label: 'Input bar',
    description: 'Signature centered bar that expands on focus.',
    Icon: PanelBottom,
  },
];

type WebWidgetLayoutPickerProps = {
  value: WebWidgetLayout;
  saving: boolean;
  onChange: (layout: WebWidgetLayout) => void;
};

export function WebWidgetLayoutPicker({
  value,
  saving,
  onChange,
}: WebWidgetLayoutPickerProps) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <div>
          <FieldLabel>Layout</FieldLabel>
          <FieldDescription>
            Choose how the widget appears on the website.
          </FieldDescription>
        </div>
        {saving ? (
          <span className="text-xs text-muted-foreground">Saving</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {layoutOptions.map(({ value: optionValue, label, description, Icon }) => {
          const selected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              aria-pressed={selected}
              disabled={saving}
              className={cn(
                'flex min-h-[132px] flex-col justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70',
                selected
                  ? 'border-foreground/30 bg-muted/60'
                  : 'border-border bg-card',
              )}
              onClick={() => onChange(optionValue)}
            >
              <span className="flex items-center justify-between gap-2">
                <Icon className="size-4 text-muted-foreground" />
                {selected ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="size-3.5" />
                  </span>
                ) : null}
              </span>
              <span className="space-y-1">
                <span className="block text-sm font-medium text-foreground">
                  {label}
                </span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  {description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}
