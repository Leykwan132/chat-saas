import { Clock3 } from 'lucide-react';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import type { AiReplyAudience } from '../../../shared/aiReplyAudience';
import { AgentSetupAudiencePanel } from './AgentSetupAudiencePanel';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  replyAudience: AiReplyAudience;
  onReplyAudienceChange: (value: AiReplyAudience) => void;
  onReplyModeChange: (value: ReplyMode) => void;
};

export function AgentSetupRoutingPanel({
  canReadRouting,
  canManageRouting,
  isLoading,
  isPublishing,
  replyMode,
  replyAudience,
  onReplyAudienceChange,
  onReplyModeChange,
}: AgentSetupRoutingPanelProps) {
  const selectedOption = REPLY_MODE_OPTIONS.find((option) => option.value === replyMode);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="m-0 text-lg font-semibold tracking-tight text-foreground">AI Replies</h2>
        <p className="m-0 text-xs leading-5 text-muted-foreground">Choose when AI replies and which customers receive them.</p>
      </div>
      {canReadRouting ? (
        isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <FieldGroup className="gap-5">
            <Field className="gap-2.5">
              <FieldLabel id="ai-reply-timing-label" className="flex items-center gap-2">
                <Clock3 className="size-4 shrink-0 text-muted-foreground" />
                <span>When should AI reply</span>
              </FieldLabel>
              <Select
                value={replyMode}
                onValueChange={(value) => onReplyModeChange(value as ReplyMode)}
                disabled={!canManageRouting || isPublishing}
              >
                <SelectTrigger aria-labelledby="ai-reply-timing-label" className="h-auto min-h-12 w-full justify-between rounded-lg border-border bg-input/50 px-4 py-3.5">
                  <SelectValue>
                    {selectedOption ? (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                        <span className="truncate text-sm font-semibold leading-tight text-foreground">
                          {selectedOption.label}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-right text-xs leading-tight text-muted-foreground">
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
                        <span className="flex w-full min-w-0 flex-col items-start gap-1 py-1.5 text-left">
                          <span className="text-sm font-semibold leading-tight text-foreground">
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
            <AgentSetupAudiencePanel
              value={replyAudience}
              onChange={onReplyAudienceChange}
              disabled={!canManageRouting || isPublishing}
            />
          </FieldGroup>
        )
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          You don&apos;t have permission to view AI reply settings for this agent.
        </p>
      )}
    </section>
  );
}
