import { Check } from 'lucide-react';

export function ChannelReadyStatus({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-800">
        <Check
          className="size-2.5 text-emerald-100"
          strokeWidth={2.5}
          aria-hidden
        />
      </span>
      <span className="truncate text-[11px] font-medium text-foreground">
        {label}
      </span>
    </span>
  );
}

export function SavedConversationStatus({
  conversationCount,
}: {
  conversationCount: number;
}) {
  return (
    <ChannelReadyStatus label={`${conversationCount} conversations saved`} />
  );
}
