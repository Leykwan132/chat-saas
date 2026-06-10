import { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion';
import { DataCollectFieldIcon } from '@/components/auto-booking/DataCollectFieldIcon';
import { PreferredTimesEditor } from '@/components/auto-booking/PreferredTimesEditor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  fieldTypePreview,
  type AssignmentStrategy,
  type FieldType,
  type SalesStyle,
  type ServiceFieldForm,
  type ServiceForm,
  type TeamUserOption,
} from '@/lib/autoBookingServiceForm';

export type WizardSelectOption = {
  value: string;
  title: string;
  description?: string;
  meta?: string;
};

export const AUTO_BOOKING_SECTION_COPY = {
  details: {
    title: 'Your service',
    subtitle: 'Name the appointment type the AI should offer in chat.',
  },
  timing: {
    title: 'Timing & availability',
    subtitle: 'Set how long appointments last and which times the AI should offer first.',
  },
  data: {
    title: 'Data to collect',
    subtitle: 'Choose what your AI agent gathers in chat before preparing the booking.',
  },
  assignment: {
    title: 'Assignment & tone',
    subtitle: 'Decide who receives bookings and how the AI approaches customers.',
  },
} as const;

export const SALES_STYLE_OPTIONS: WizardSelectOption[] = [
  {
    value: 'proactive',
    title: 'Proactive',
    description: 'Actively suggests booking and nudges customers toward scheduling.',
  },
  {
    value: 'neutral',
    title: 'Neutral',
    description: 'Offers booking when relevant without being pushy.',
  },
  {
    value: 'gentle',
    title: 'Gentle',
    description: 'Mentions booking softly and waits for the customer to express interest.',
  },
];

export const ASSIGNMENT_STRATEGY_OPTIONS: WizardSelectOption[] = [
  {
    value: 'conversation_owner',
    title: 'Conversation owner first',
    description: 'Assigns the booking to whoever is already handling the chat.',
  },
  {
    value: 'balanced',
    title: 'Balanced available teammate',
    description: 'Picks the teammate with the most open capacity right now.',
  },
  {
    value: 'round_robin',
    title: 'Round robin',
    description: 'Rotates bookings evenly across all available teammates.',
  },
  {
    value: 'specific_user',
    title: 'Specific teammate',
    description: 'Always assigns bookings to one chosen team member.',
  },
];

export const CUSTOM_FIELD_TYPE_OPTIONS: WizardSelectOption[] = [
  { value: 'text', title: 'Text', description: 'Free-form text answer.' },
  { value: 'number', title: 'Number', description: 'Numeric value only.' },
  { value: 'select', title: 'Select', description: 'Choose from a list of options.' },
  { value: 'boolean', title: 'Yes / No', description: 'Simple yes or no answer.' },
];

const EMPTY_FIELD_DRAFT: ServiceFieldForm = {
  key: '',
  label: '',
  type: 'text',
  optionsText: '',
};

type FieldSuggestion = { id: string; label: string; type: FieldType };

const CUSTOM_FIELD_SUGGESTIONS: Array<{ label: string; type: FieldType }> = [
  { label: 'Email', type: 'text' },
  { label: 'Company', type: 'text' },
  { label: 'Special requests', type: 'text' },
];

function getAvailableFieldSuggestions(form: ServiceForm): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];

  for (const preset of CUSTOM_FIELD_SUGGESTIONS) {
    const alreadyAdded = form.fields.some(
      (item) => item.label.trim().toLowerCase() === preset.label.toLowerCase(),
    );
    if (!alreadyAdded) {
      suggestions.push({
        id: `custom-${preset.label}`,
        label: preset.label,
        type: preset.type,
      });
    }
  }

  return suggestions;
}

export function AutoBookingSectionHeading({
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
                onChange(
                  options.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="size-10 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={`Remove option ${index + 1}`}
              onClick={() => {
                if (options.length === 1) {
                  onChange(['']);
                  return;
                }
                onChange(options.filter((_, itemIndex) => itemIndex !== index));
              }}
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="size-10 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Add option"
              onClick={() => onChange([...options, ''])}
            >
              <Plus className="size-4" />
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
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="flex w-full flex-col gap-3"
      >
        {options.map((option) => (
          <Label
            key={option.value}
            htmlFor={`${idPrefix}-${option.value}`}
            className={cn(
              'block w-full font-normal',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
            )}
          >
            <div
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-4 transition-colors',
                value === option.value
                  ? 'border-foreground/30 bg-foreground/[0.03] ring-1 ring-foreground/10'
                  : 'border-border hover:border-foreground/20 hover:bg-accent/40',
              )}
            >
              <RadioGroupItem
                value={option.value}
                id={`${idPrefix}-${option.value}`}
                className="mt-0.5 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                  {option.description}
                </span>
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
        <SelectTrigger
          className={cn(
            'h-10 w-full justify-between border-input bg-background px-3 py-2 text-sm',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <SelectValue placeholder={`Select ${label.toLowerCase()}`}>
            {selected ? (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-medium">{selected.title}</span>
                {selected.meta ? (
                  <span className="shrink-0 text-xs text-muted-foreground">{selected.meta}</span>
                ) : null}
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="h-auto items-start py-2.5 text-sm"
            >
              <div className="flex flex-col gap-0.5 pr-4">
                <span className="flex items-center gap-2 leading-none">
                  <span className="font-medium">{option.title}</span>
                  {option.meta ? (
                    <span className="text-xs text-muted-foreground">{option.meta}</span>
                  ) : null}
                </span>
                {option.description ? (
                  <span className="text-xs leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AutoBookingServiceDetailsFields({
  form,
  setForm,
  disabled = false,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Service name</span>
        <Input
          value={form.name}
          disabled={disabled}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Consultation"
          className="h-12 text-base"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Description</span>
        <Textarea
          value={form.description}
          disabled={disabled}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Briefly describe what this appointment is for."
          rows={5}
          className="min-h-32 resize-y"
        />
      </label>
    </div>
  );
}

export function AutoBookingTimingFields({
  form,
  setForm,
  disabled = false,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <WizardNumberField
          label="Duration"
          inputSuffix="(minutes)"
          hint="How long each appointment lasts."
          value={form.durationMinutes}
          disabled={disabled}
          onChange={(value) => setForm((prev) => ({ ...prev, durationMinutes: value }))}
        />
        <WizardNumberField
          label="Gap"
          inputSuffix="(minutes)"
          hint="Minutes blocked after each appointment. 0 = back-to-back."
          value={form.bufferMinutes}
          disabled={disabled}
          onChange={(value) => setForm((prev) => ({ ...prev, bufferMinutes: value }))}
        />
      </div>

      <PreferredTimesEditor
        enabled={form.preferredTimeEnabled}
        times={form.preferredTimes}
        disabled={disabled}
        onEnabledChange={(checked) =>
          setForm((prev) => ({ ...prev, preferredTimeEnabled: checked }))
        }
        onTimesChange={(times) => setForm((prev) => ({ ...prev, preferredTimes: times }))}
      />
    </div>
  );
}

export function AutoBookingDataCollectionFields({
  form,
  setForm,
  disabled = false,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  disabled?: boolean;
}) {
  const [addFieldDialogOpen, setAddFieldDialogOpen] = useState(false);
  const [fieldDraft, setFieldDraft] = useState<ServiceFieldForm>(EMPTY_FIELD_DRAFT);
  const [selectOptionRows, setSelectOptionRows] = useState<string[]>(['']);

  const availableFieldSuggestions = useMemo(
    () => getAvailableFieldSuggestions(form),
    [form.fields],
  );

  const closeAddFieldDialog = () => {
    setAddFieldDialogOpen(false);
    setFieldDraft({ ...EMPTY_FIELD_DRAFT });
    setSelectOptionRows(['']);
  };

  const openAddFieldDialog = () => {
    setFieldDraft({ ...EMPTY_FIELD_DRAFT });
    setSelectOptionRows(['']);
    setAddFieldDialogOpen(true);
  };

  const applyFieldSuggestion = (suggestion: FieldSuggestion) => {
    setForm((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          key: '',
          label: suggestion.label,
          type: suggestion.type,
          optionsText: '',
        },
      ],
    }));
    closeAddFieldDialog();
  };

  const confirmFieldDraft = () => {
    const trimmedLabel = fieldDraft.label.trim();
    if (!trimmedLabel) {
      toast.error('Enter a field label before confirming.');
      return;
    }

    let optionsText = fieldDraft.optionsText;
    if (fieldDraft.type === 'select') {
      const options = selectOptionRows.map((option) => option.trim()).filter(Boolean);
      if (options.length === 0) {
        toast.error('Add at least one option for select fields.');
        return;
      }
      optionsText = options.join(', ');
    }

    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, { ...fieldDraft, label: trimmedLabel, optionsText }],
    }));
    closeAddFieldDialog();
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3">
        {form.fields.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            {form.fields.map((field, index) => (
              <div
                key={`${field.key}-${index}`}
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <DataCollectFieldIcon type={field.type} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{field.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {fieldTypePreview(field)}
                    </span>
                  </div>
                </div>
                {!disabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${field.label}`}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        fields: prev.fields.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {!disabled ? (
          <Button
            type="button"
            variant="link"
            className="h-auto w-fit gap-1.5 px-0 text-muted-foreground"
            onClick={openAddFieldDialog}
          >
            <Plus className="size-4" />
            Add more field
          </Button>
        ) : null}
      </div>

      <Dialog
        open={addFieldDialogOpen}
        onOpenChange={(open) => {
          setAddFieldDialogOpen(open);
          if (!open) {
            setFieldDraft({ ...EMPTY_FIELD_DRAFT });
            setSelectOptionRows(['']);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Field</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {availableFieldSuggestions.length > 0 ? (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Suggestions</span>
                  <Suggestions>
                    {availableFieldSuggestions.map((suggestion) => (
                      <Suggestion
                        key={suggestion.id}
                        suggestion={suggestion.label}
                        className="gap-1.5"
                        onClick={() => applyFieldSuggestion(suggestion)}
                      >
                        <DataCollectFieldIcon type={suggestion.type} />
                        {suggestion.label}
                      </Suggestion>
                    ))}
                  </Suggestions>
                </div>
                <Separator />
              </>
            ) : null}

            <div className="flex flex-col gap-3">
              <WizardSelectField
                label="Type"
                value={fieldDraft.type}
                options={CUSTOM_FIELD_TYPE_OPTIONS}
                onChange={(value) => {
                  setFieldDraft((prev) => ({
                    ...prev,
                    type: value as FieldType,
                  }));
                  if (value === 'select') setSelectOptionRows(['']);
                }}
              />
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">Field label</span>
                <Input
                  placeholder="Field label"
                  value={fieldDraft.label}
                  onChange={(event) =>
                    setFieldDraft((prev) => ({ ...prev, label: event.target.value }))
                  }
                />
              </div>
              {fieldDraft.type === 'select' ? (
                <SelectFieldOptionsEditor options={selectOptionRows} onChange={setSelectOptionRows} />
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-4 sm:gap-6">
            <Button
              type="button"
              variant="link"
              className="h-auto px-0 text-muted-foreground"
              onClick={closeAddFieldDialog}
            >
              Cancel
            </Button>
            <Button type="button" onClick={confirmFieldDraft}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2.5">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Note: </span>
          Your AI agent will collect this information naturally in conversation, then prepare the
          booking before checking availability.
        </p>
      </div>
    </div>
  );
}

export function AutoBookingAssignmentFields({
  form,
  setForm,
  teamUserOptions,
  disabled = false,
}: {
  form: ServiceForm;
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  teamUserOptions: TeamUserOption[];
  disabled?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <WizardRadioOptionGroup
        label="Assignment"
        value={form.assignmentStrategy}
        options={ASSIGNMENT_STRATEGY_OPTIONS}
        disabled={disabled}
        onChange={(value) =>
          setForm((prev) => ({
            ...prev,
            assignmentStrategy: value as AssignmentStrategy,
          }))
        }
      />

      {form.assignmentStrategy === 'specific_user' ? (
        <WizardSelectField
          label="Specific teammate"
          value={form.specificWorkosUserId}
          disabled={disabled}
          options={teamUserOptions.map((user) => ({
            value: user.value,
            title: user.name,
            meta: user.roleLabel,
          }))}
          onChange={(value) => setForm((prev) => ({ ...prev, specificWorkosUserId: value }))}
        />
      ) : null}

      <WizardSelectField
        label="Tone style"
        value={form.salesStyle}
        disabled={disabled}
        options={SALES_STYLE_OPTIONS}
        onChange={(value) => setForm((prev) => ({ ...prev, salesStyle: value as SalesStyle }))}
      />
    </div>
  );
}
