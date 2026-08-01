import {
  inboxColumnClassName,
  inboxColumnHeaderClassName,
  inboxColumnScrollClassName,
} from '@/components/inbox/inboxLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { INBOX_SIDEBAR_WIDTH } from '@/lib/sidebarNavStyles';
import { cn } from '@/lib/utils';

function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3.5 w-[55%] rounded-md" />
          <Skeleton className="h-3 w-10 shrink-0 rounded-md" />
        </div>
        <Skeleton className="h-3 w-[80%] rounded-md" />
      </div>
    </div>
  );
}

export function InboxConversationListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <ConversationRowSkeleton key={index} />
      ))}
    </>
  );
}

export function InboxFilterSidebarSkeleton() {
  return (
    <div
      className={cn(
        inboxColumnClassName,
        'shrink-0 border-r border-border bg-background',
      )}
      style={{ width: INBOX_SIDEBAR_WIDTH }}
      aria-hidden
    >
      <div className="flex items-start justify-between px-4 pb-0 pt-4">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="size-[1.8rem] rounded-md" />
      </div>
      <div className={cn(inboxColumnScrollClassName, 'space-y-[0.675rem] px-[0.45rem] py-[0.675rem]')}>
        {Array.from({ length: 4 }, (_, sectionIndex) => (
          <div key={sectionIndex} className="space-y-[0.3375rem] px-[0.225rem]">
            <Skeleton className="mx-[0.45rem] h-[0.675rem] w-[3.6rem] rounded-md" />
            {Array.from({ length: sectionIndex === 1 ? 3 : 2 }, (_, rowIndex) => (
              <Skeleton
                key={rowIndex}
                className="h-[2.025rem] w-full rounded-xl"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InboxChatAreaSkeleton() {
  return (
    <div className={cn(inboxColumnClassName, 'min-w-0 flex-1 bg-background')} aria-hidden>
      <div className={cn(inboxColumnHeaderClassName, 'justify-between gap-4 px-4')}>
        <Skeleton className="h-5 w-36 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-6 py-6">
        <div className="flex justify-center">
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-14 w-[58%] rounded-2xl rounded-tl-sm" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[45%] rounded-2xl rounded-tr-sm" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-16 w-[52%] rounded-2xl rounded-tl-sm" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-[40%] rounded-2xl rounded-tr-sm" />
        </div>
      </div>
      <div className="shrink-0 border-t border-border p-4">
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function InboxConversationColumnSkeleton() {
  return (
    <div
      className={cn(
        inboxColumnClassName,
        'w-[300px] shrink-0 border-r border-border bg-background',
      )}
      aria-hidden
    >
      <div className={cn(inboxColumnHeaderClassName, 'gap-2 px-3')}>
        <Skeleton className="h-9 min-w-0 flex-1 rounded-lg" />
        <Skeleton className="size-8 shrink-0 rounded-md" />
      </div>
      <div className={cn(inboxColumnScrollClassName, 'no-scrollbar')}>
        <InboxConversationListSkeleton />
      </div>
    </div>
  );
}

export function InboxPageSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 w-full overflow-hidden"
      aria-busy
      aria-live="polite"
      aria-label="Loading inbox"
    >
      <InboxFilterSidebarSkeleton />
      <InboxConversationColumnSkeleton />
      <InboxChatAreaSkeleton />
    </div>
  );
}
