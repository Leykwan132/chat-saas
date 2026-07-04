import {
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { WebWidgetTheme } from '../../../shared/webWidgetThemes';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { cn } from '@/lib/utils';

type ThemeOption = {
  value: WebWidgetTheme;
  label: string;
  description: string;
  Icon: LucideIcon;
};

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Light prompt input and chat surface.',
    Icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dark prompt input and chat surface.',
    Icon: Moon,
  },
];

type WebWidgetThemePickerProps = {
  value: WebWidgetTheme;
  saving: boolean;
  onChange: (theme: WebWidgetTheme) => void;
};

export function WebWidgetThemePicker({
  value,
  saving,
  onChange,
}: WebWidgetThemePickerProps) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <div>
          <FieldLabel>Theme</FieldLabel>
          <FieldDescription>
            Choose the color mode for the website widget.
          </FieldDescription>
        </div>
        {saving ? (
          <span className="text-xs text-muted-foreground">Saving</span>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {themeOptions.map(({ value: optionValue, label, description, Icon }) => {
          const selected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              aria-pressed={selected}
              disabled={saving}
              className={cn(
                'flex min-h-[104px] flex-col justify-between rounded-lg border bg-card p-3 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70',
                selected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border',
              )}
              onClick={() => onChange(optionValue)}
            >
              <Icon className="size-4 text-muted-foreground" />
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
