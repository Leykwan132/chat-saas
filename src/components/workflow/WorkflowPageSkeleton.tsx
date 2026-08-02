import { Skeleton } from '@/components/ui/skeleton';

function WorkflowNodeSkeleton({
  className,
  nodeRole,
  titleWidth = 'w-28',
  lines = ['w-full', 'w-2/3'],
}: {
  className: string;
  nodeRole: 'root' | 'subnode';
  titleWidth?: string;
  lines?: string[];
}) {
  return (
    <div className={className} data-workflow-skeleton-node={nodeRole}>
      <div className="flex min-h-24 w-[232px] flex-col justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-4 rounded-md" />
          <Skeleton className={`h-4 ${titleWidth}`} />
        </div>
        {lines.map((lineWidth) => (
          <Skeleton key={lineWidth} className={`h-3 ${lineWidth}`} />
        ))}
        <div className="mt-1 flex gap-1.5">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function WorkflowPageSkeleton() {
  return (
    <div className="relative flex h-full min-h-[60vh] overflow-hidden bg-background">
      <div
        className="relative z-10 hidden w-64 shrink-0 flex-col border-r border-border bg-background/95 p-4 md:flex"
        data-workflow-skeleton-navigation="workspace"
      >
        <div className="flex items-center gap-3 pb-5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-11/12 rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-9 w-10/12 rounded-lg" />
        </div>
        <div className="mt-auto space-y-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
        </div>
      </div>
      <div className="relative flex min-w-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] bg-[length:28px_28px] opacity-40" />
        <div className="absolute left-6 top-6 z-10 flex flex-col items-start gap-3">
          <Skeleton
            className="h-9 w-32 rounded-md"
            data-workflow-skeleton-navigation="page-title"
          />
          <div
            className="flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 backdrop-blur"
            data-workflow-skeleton-navigation="canvas-tools"
          >
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="mx-1 h-8 w-px rounded-none" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div
            className="flex w-48 flex-col gap-2 rounded-lg border border-border bg-background/95 p-2 backdrop-blur"
            data-workflow-skeleton-navigation="workflow-tabs"
          >
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-11/12 rounded-md" />
            <Skeleton className="h-9 w-10/12 rounded-md" />
          </div>
        </div>
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="size-10 rounded-xl" />
        </div>
        <svg
          aria-hidden="true"
          className="absolute inset-0 h-full w-full text-border"
          data-workflow-skeleton-connector="dotted-curve"
          preserveAspectRatio="none"
          viewBox="0 0 1000 620"
        >
          <path
            d="M 360 310 C 470 220 560 150 690 150"
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 7"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M 360 310 C 500 300 560 300 690 300"
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 7"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path
            d="M 360 310 C 470 400 560 470 690 470"
            fill="none"
            stroke="currentColor"
            strokeDasharray="5 7"
            strokeLinecap="round"
            strokeWidth="3"
          />
        </svg>
        <WorkflowNodeSkeleton
          className="absolute left-[24%] top-1/2 -translate-y-1/2"
          nodeRole="root"
          titleWidth="w-36"
          lines={['w-full', 'w-4/5', 'w-2/3']}
        />
        <WorkflowNodeSkeleton
          className="absolute left-[68%] top-[15%]"
          nodeRole="subnode"
          titleWidth="w-32"
        />
        <WorkflowNodeSkeleton
          className="absolute left-[68%] top-[39%]"
          nodeRole="subnode"
          titleWidth="w-28"
          lines={['w-11/12', 'w-3/4']}
        />
        <WorkflowNodeSkeleton
          className="absolute left-[68%] top-[63%]"
          nodeRole="subnode"
          titleWidth="w-36"
          lines={['w-full', 'w-1/2']}
        />
        <Skeleton className="absolute bottom-4 left-4 z-10 h-9 w-64 rounded-xl" />
      </div>
    </div>
  );
}
