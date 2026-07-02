import { Skeleton } from '@/components/ui/skeleton';

function WorkflowNodeSkeleton({
  className,
  wide = false,
}: {
  className: string;
  wide?: boolean;
}) {
  return (
    <div className={className}>
      <div className="flex min-h-20 w-[220px] flex-col justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-4 rounded-md" />
          <Skeleton className={wide ? 'h-4 w-36' : 'h-4 w-24'} />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function WorkflowPageSkeleton() {
  return (
    <div className="relative flex h-full min-h-[60vh] overflow-hidden bg-background">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
        <Skeleton className="h-10 w-36 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <WorkflowNodeSkeleton className="absolute left-[12%] top-[30%]" />
      <WorkflowNodeSkeleton className="absolute left-[38%] top-[48%]" wide />
      <WorkflowNodeSkeleton className="absolute left-[64%] top-[30%]" />
      <Skeleton className="absolute left-[28%] top-[41%] h-1 w-[14%] rotate-[22deg] rounded-full" />
      <Skeleton className="absolute left-[54%] top-[42%] h-1 w-[14%] -rotate-[22deg] rounded-full" />
      <Skeleton className="absolute bottom-4 left-4 h-9 w-64 rounded-xl" />
    </div>
  );
}
