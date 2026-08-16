import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WizardSelectOption } from '@/components/services/serviceFormConstants';
import { cn } from '@/lib/utils';

export function ServiceSectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function WizardNumberField({
  label,
  hint,
  inputSuffix,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  inputSuffix?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex h-full min-w-0 flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          value={value === 0 ? '0' : String(value)}
          disabled={disabled}
          className={cn('h-10', inputSuffix && 'pr-[5.5rem]', disabled && 'cursor-not-allowed opacity-60')}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '');
            onChange(digits === '' ? 0 : Number(digits));
          }}
        />
        {inputSuffix ? (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
            {inputSuffix}
          </span>
        ) : null}
      </div>
      {hint ? <span className="text-xs leading-snug text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function SelectFieldOptionsEditor({
  options,
  onChange,
  disabled = false,
}: {
  options: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Options</span>
      <div className="flex flex-col gap-2">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={`Option ${index + 1}`}
              value={option}
              disabled={disabled}
              onChange={(event) =>
                onChange(options.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="size-10 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Remove option ${index + 1}`}
              onClick={() => onChange(options.length === 1 ? [''] : options.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WizardRadioOptionGroup({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: WizardSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const idPrefix = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex w-full flex-col gap-3">
      <span className="text-sm font-medium">{label}</span>
      <RadioGroup value={value} onValueChange={onChange} disabled={disabled} className="flex w-full flex-col gap-3">
        {options.map((option) => (
          <Label key={option.value} htmlFor={`${idPrefix}-${option.value}`} className={cn('block w-full font-normal', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
            <div className={cn('flex w-full items-start gap-3 rounded-xl border p-4 transition-colors', value === option.value ? 'border-foreground/30 bg-foreground/[0.03] ring-1 ring-foreground/10' : 'border-border hover:border-foreground/20 hover:bg-accent/40')}>
              <RadioGroupItem value={option.value} id={`${idPrefix}-${option.value}`} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">{option.description}</span>
              </div>
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}

export function WizardSelectField({
  label,
  value,
  options,
  onChange,
  compact = false,
  disabled = false,
}: {
  label: string;
  value: string;
  options: WizardSelectOption[];
  onChange: (value: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn('flex flex-col gap-2', compact && 'gap-1.5')}>
      <span className={cn('text-sm font-medium', compact && 'text-xs')}>{label}</span>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn('h-10 w-full justify-between border-input bg-background px-3 py-2 text-sm', disabled && 'cursor-not-allowed opacity-60')}>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
            {selected ? <span className="flex min-w-0 items-center gap-2"><span className="truncate font-medium">{selected.title}</span>{selected.meta ? <span className="shrink-0 text-xs text-muted-foreground">{selected.meta}</span> : null}</span> : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="h-auto items-start py-2.5 text-sm">
              <div className="flex flex-col gap-0.5 pr-4">
                <span className="flex items-center gap-2 leading-none"><span className="font-medium">{option.title}</span>{option.meta ? <span className="text-xs text-muted-foreground">{option.meta}</span> : null}</span>
                {option.description ? <span className="text-xs leading-snug text-muted-foreground">{option.description}</span> : null}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
