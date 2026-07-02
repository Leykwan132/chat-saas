import { Skeleton } from '@/components/ui/skeleton';
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
  FieldLabel,
} from '@/components/ui/field';
import {
  REPLY_MODE_OPTIONS,
  type ReplyMode,
} from '@/components/agent-setup/agentSetupOptions';

type AgentSetupRoutingPanelProps = {
  canReadRouting: boolean;
  canManageRouting: boolean;
  isLoading: boolean;
  isPublishing: boolean;
  replyMode: ReplyMode;
  onReplyModeChange: (value: ReplyMode) => void;
};

export function AgentSetupRoutingPanel({
  canReadRouting,
  canManageRouting,
  isLoading,
  isPublishing,
  replyMode,
  onReplyModeChange,
}: AgentSetupRoutingPanelProps) {
  const selectedOption = REPLY_MODE_OPTIONS.find((option) => option.value === replyMode);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">
        Triggers
      </h2>
      {canReadRouting ? (
        isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field className="gap-2.5">
              <FieldLabel>Reply mode</FieldLabel>
              <Select
                value={replyMode}
                onValueChange={(value) => onReplyModeChange(value as ReplyMode)}
                disabled={!canManageRouting || isPublishing}
              >
                <SelectTrigger className="h-auto min-h-12 w-full justify-between rounded-lg border-border bg-input/50 px-4 py-3.5">
                  <SelectValue>
                    {selectedOption ? (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                        <span className="shrink-0 text-[13px] font-semibold leading-tight text-foreground">
                          {selectedOption.label}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-right text-[11px] leading-tight text-muted-foreground">
                          {selectedOption.selectedDescription}
                        </span>
                      </span>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="w-[var(--radix-select-trigger-width)]">
                  <SelectGroup>
                    {REPLY_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} textValue={option.label}>
                        <span className="flex w-full min-w-0 flex-col gap-1 py-1.5 text-left">
                          <span className="text-[13px] font-semibold leading-tight text-foreground">
                            {option.label}
                          </span>
                          <span className="whitespace-normal text-[11px] leading-snug text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
        )
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          You don&apos;t have permission to view trigger settings for this agent.
        </p>
      )}
    </section>
  );
}
