import { useState } from 'react';
import {
  EMOJI_USE_OPTIONS,
  FORMALITY_OPTIONS,
  HUMOR_LEVEL_OPTIONS,
  RESPONSE_LENGTH_OPTIONS,
} from '@/components/agent-setup/agentSetupOptions';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Languages,
  List,
  type LucideIcon,
  MessageSquareText,
  Smile,
  Type,
} from 'lucide-react';
import type { LandingPreviewAgentSetup } from './landingAppPreviewData';

type ModelControlKey = 'name' | 'model' | 'responseLength' | 'emojiUse' | 'formality' | 'humorLevel';

type PreviewControlOption = {
  value: string;
  label: string;
  description: string;
};

const modelControls = [
  { label: 'Name', valueKey: 'name', detail: '', Icon: Type },
  { label: 'Model', valueKey: 'model', detail: '', Icon: Bot },
  { label: 'Response length', valueKey: 'responseLength', detail: 'Short replies for quick answers.', Icon: MessageSquareText },
  { label: 'Emoji use', valueKey: 'emojiUse', detail: '"Great, happy to help 😊✨"', Icon: Smile },
  { label: 'Formality', valueKey: 'formality', detail: 'Natural, helpful, and still clear.', Icon: Languages },
  { label: 'Humor level', valueKey: 'humorLevel', detail: 'A little warmth when it fits the chat.', Icon: Smile },
] as const satisfies ReadonlyArray<{
  label: string;
  valueKey: ModelControlKey;
  detail: string;
  Icon: LucideIcon;
}>;

const setupOption = (label: string, description: string): PreviewControlOption => ({
  value: label,
  label,
  description,
});

const styleOption = (option: { label: string; description: string }): PreviewControlOption => ({
  value: option.label,
  label: option.label,
  description: option.description,
});

const previewControlOptions: Record<ModelControlKey, PreviewControlOption[]> = {
  name: [
    setupOption('Sales Concierge', 'Main sales agent for Arden Heights.'),
    setupOption('Booking Assistant', 'Helps leads choose a showroom slot.'),
    setupOption('Lead Qualifier', 'Qualifies interest before handoff.'),
  ],
  model: [
    setupOption('DeepSeek V4 Flash', 'Fast default model for sales replies.'),
    setupOption('Google Gemini 3.1 Flash Lite', 'Lightweight paid model for quick chats.'),
    setupOption('OpenAI GPT-OSS 120B', 'Stronger reasoning for complex leads.'),
  ],
  responseLength: RESPONSE_LENGTH_OPTIONS.map(styleOption),
  emojiUse: EMOJI_USE_OPTIONS.map(styleOption),
  formality: FORMALITY_OPTIONS.map(styleOption),
  humorLevel: HUMOR_LEVEL_OPTIONS.map(styleOption),
};

function ControlRow({
  control,
  value,
  onValueChange,
}: {
  control: typeof modelControls[number];
  value: string;
  onValueChange: (value: string) => void;
}) {
  const options = previewControlOptions[control.valueKey];
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-zinc-800">
        <control.Icon className="size-4 text-zinc-500" />
        {control.label}
      </div>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="!h-10 w-full justify-between rounded-lg border border-zinc-200 bg-zinc-100 px-4 text-left text-[13px] text-zinc-950">
          <SelectValue>
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
              <span className="truncate font-semibold">{selectedOption.label}</span>
              {control.detail ? (
                <span className="min-w-0 flex-1 truncate text-right text-[11px] leading-4 text-zinc-500">
                  {selectedOption.description}
                </span>
              ) : null}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="z-[80] w-[var(--radix-select-trigger-width)]">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                textValue={option.label}
                className="focus:!bg-transparent focus:!text-foreground data-[highlighted]:!bg-transparent data-[highlighted]:!text-foreground"
              >
                <span className="flex w-full min-w-0 flex-col items-start gap-1 py-1.5 text-left">
                  <span className="truncate text-[13px] font-semibold leading-tight text-foreground">
                    {option.label}
                  </span>
                  <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function LandingAppPreviewAgentSetup({
  setup,
}: {
  setup: LandingPreviewAgentSetup;
}) {
  const [values, setValues] = useState<Record<ModelControlKey, string>>(() => ({
    name: setup.name,
    model: setup.model,
    responseLength: setup.responseLength,
    emojiUse: setup.emojiUse,
    formality: setup.formality,
    humorLevel: setup.humorLevel,
  }));

  const updateValue = (key: ModelControlKey) => (value: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [key]: value,
    }));
  };

  return (
    <div data-preview-section-content className="min-h-0 flex-1 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="min-h-0">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-zinc-950">System Prompt</h3>
            <button type="button" className="flex h-8 items-center gap-2 rounded-full border border-zinc-200 px-3 text-xs font-medium text-zinc-700">
              <List className="size-3.5" />
              Template Library
            </button>
          </div>
          <div className="h-[calc(100%-2.75rem)] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 p-4 text-[12px] leading-5 text-zinc-900">
            <pre className="whitespace-pre-wrap font-sans">{setup.prompt}</pre>
          </div>
        </div>
        <aside className="min-h-0 overflow-hidden">
          <h3 className="mb-4 text-base font-semibold text-zinc-950">Model & Style</h3>
          <div className="space-y-4">
            {modelControls.map((control) => (
              <ControlRow
                key={control.label}
                control={control}
                value={values[control.valueKey]}
                onValueChange={updateValue(control.valueKey)}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
