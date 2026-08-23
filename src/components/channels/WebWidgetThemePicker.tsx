import {
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import type { WebWidgetTheme } from '../../../shared/webWidgetThemes';
import { cn } from '@/lib/utils';

type ThemeOption = {
  value: WebWidgetTheme;
  label: string;
  Icon: LucideIcon;
};

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    Icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Theme</span>
        {saving ? (
          <span className="text-xs text-muted-foreground">Saving</span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Theme">
        {themeOptions.map(({ value: optionValue, label, Icon }) => {
          const selected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              aria-pressed={selected}
              disabled={saving}
              className={cn(
                'flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70',
                selected
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border',
              )}
              onClick={() => onChange(optionValue)}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
