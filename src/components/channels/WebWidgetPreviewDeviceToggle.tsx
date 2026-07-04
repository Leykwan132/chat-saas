import {
  Monitor,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type WebWidgetPreviewDevice = 'desktop' | 'mobile';

type DeviceOption = {
  value: WebWidgetPreviewDevice;
  label: string;
  Icon: LucideIcon;
};

const deviceOptions: DeviceOption[] = [
  {
    value: 'desktop',
    label: 'Desktop',
    Icon: Monitor,
  },
  {
    value: 'mobile',
    label: 'Mobile',
    Icon: Smartphone,
  },
];

type WebWidgetPreviewDeviceToggleProps = {
  value: WebWidgetPreviewDevice;
  onChange: (value: WebWidgetPreviewDevice) => void;
};

export function WebWidgetPreviewDeviceToggle({
  value,
  onChange,
}: WebWidgetPreviewDeviceToggleProps) {
  return (
    <div className="flex items-center rounded-full border border-border bg-muted/30 p-1">
      {deviceOptions.map(({ value: optionValue, label, Icon }) => {
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={selected}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition',
              selected
                ? 'bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(optionValue)}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
