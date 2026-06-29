import { Input } from '@/components/ui/input';
import { ModelPicker, type ModelPickerOption } from '@/components/ModelPicker';
import {
  Bot,
  CaseSensitive,
  Laugh,
  MessageSquareText,
  Smile,
  TextCursorInput,
  type LucideIcon,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  EMOJI_USE_OPTIONS,
  FORMALITY_OPTIONS,
  HUMOR_LEVEL_OPTIONS,
  RESPONSE_LENGTH_OPTIONS,
  type EmojiUse,
  type Formality,
  type HumorLevel,
  type ResponseLength,
} from '@/components/agent-setup/agentSetupOptions';

type SelectOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

function FieldLabelWithIcon({ Icon, children }: { Icon: LucideIcon; children: string }) {
  return (
    <FieldLabel className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span>{children}</span>
    </FieldLabel>
  );
}

type AgentSetupConfigurationPanelProps = {
  name: string;
  model: string;
  models: ModelPickerOption[] | undefined;
  responseLength: ResponseLength;
  emojiUse: EmojiUse;
  formality: Formality;
  humorLevel: HumorLevel;
  onNameChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onResponseLengthChange: (value: ResponseLength) => void;
  onEmojiUseChange: (value: EmojiUse) => void;
  onFormalityChange: (value: Formality) => void;
  onHumorLevelChange: (value: HumorLevel) => void;
};

function SettingSelect<T extends string>({
  label,
  value,
  options,
  Icon,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  Icon: LucideIcon;
  onChange: (value: T) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Field className="gap-2.5">
      <FieldLabelWithIcon Icon={Icon}>{label}</FieldLabelWithIcon>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
        <SelectTrigger className="h-auto min-h-12 w-full justify-between rounded-lg border-border bg-input/50 px-4 py-3.5">
          <SelectValue>
            {selectedOption ? (
              <span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                <span className="truncate text-sm font-semibold leading-tight text-foreground">
                  {selectedOption.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-xs leading-tight text-muted-foreground">
                  {selectedOption.description}
                </span>
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="w-[var(--radix-select-trigger-width)]">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} textValue={option.label}>
                <span className="flex w-full min-w-0 flex-col items-start gap-1 py-1.5 text-left">
                  <span className="truncate text-sm font-semibold leading-tight text-foreground">
                    {option.label}
                  </span>
                  <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

export function AgentSetupConfigurationPanel({
  name,
  model,
  models,
  responseLength,
  emojiUse,
  formality,
  humorLevel,
  onNameChange,
  onModelChange,
  onResponseLengthChange,
  onEmojiUseChange,
  onFormalityChange,
  onHumorLevelChange,
}: AgentSetupConfigurationPanelProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">
        Model & Style
      </h2>
      <FieldGroup className="gap-5">
        <Field className="gap-2.5">
          <FieldLabel className="flex items-center gap-2" htmlFor="agent-name">
            <TextCursorInput className="size-4 shrink-0 text-muted-foreground" />
            <span>Name</span>
          </FieldLabel>
          <Input
            id="agent-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="e.g., Support Assistant"
            className="h-12 border-border px-4"
          />
        </Field>
        <Field className="gap-2.5">
          <FieldLabelWithIcon Icon={Bot}>Model</FieldLabelWithIcon>
          <ModelPicker
            models={models}
            value={model}
            onChange={onModelChange}
            className="min-h-12 rounded-lg border-border px-4"
          />
        </Field>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <SettingSelect
            label="Response length"
            value={responseLength}
            options={RESPONSE_LENGTH_OPTIONS}
            Icon={MessageSquareText}
            onChange={onResponseLengthChange}
          />
          <SettingSelect
            label="Emoji use"
            value={emojiUse}
            options={EMOJI_USE_OPTIONS}
            Icon={Smile}
            onChange={onEmojiUseChange}
          />
          <SettingSelect
            label="Formality"
            value={formality}
            options={FORMALITY_OPTIONS}
            Icon={CaseSensitive}
            onChange={onFormalityChange}
          />
          <SettingSelect
            label="Humor level"
            value={humorLevel}
            options={HUMOR_LEVEL_OPTIONS}
            Icon={Laugh}
            onChange={onHumorLevelChange}
          />
        </div>
      </FieldGroup>
    </section>
  );
}
