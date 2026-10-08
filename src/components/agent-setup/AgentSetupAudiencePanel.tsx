import { AI_REPLY_AUDIENCE_OPTIONS, type AiReplyAudience } from '../../../shared/aiReplyAudience';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  value: AiReplyAudience;
  onChange: (value: AiReplyAudience) => void;
  disabled: boolean;
};

export function AgentSetupAudiencePanel({ value, onChange, disabled }: Props) {
  const selected = AI_REPLY_AUDIENCE_OPTIONS.find((option) => option.value === value);
  return (
    <div className="flex flex-col gap-4">
      <h2 id="ai-reply-audience-heading" className="m-0 text-lg font-semibold tracking-tight text-foreground">
        Who should AI reply to?
      </h2>
      <Select value={value} onValueChange={(next) => onChange(next as AiReplyAudience)} disabled={disabled}>
        <SelectTrigger aria-labelledby="ai-reply-audience-heading" className="h-auto min-h-12 w-full rounded-lg border-border bg-input/50 px-4 py-3.5">
          <SelectValue><span className="text-[13px] font-semibold">{selected?.label}</span></SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="w-[var(--radix-select-trigger-width)]">
          <SelectGroup>
            {AI_REPLY_AUDIENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value} textValue={option.label}>
                <span className="flex min-w-0 flex-col gap-1 py-1.5 text-left">
                  <span className="text-[13px] font-semibold">{option.label}</span>
                  <span className="whitespace-normal text-[11px] leading-snug text-muted-foreground">{option.description}</span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <p className="m-0 text-xs leading-relaxed text-muted-foreground">{selected?.description}</p>
      {value === 'ads' && <p className="m-0 text-xs leading-relaxed text-muted-foreground">Ad tracking currently supports WhatsApp. Customers without confirmed ad information are excluded.</p>}
    </div>
  );
}
