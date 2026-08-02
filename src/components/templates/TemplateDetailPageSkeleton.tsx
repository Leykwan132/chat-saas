import { Skeleton } from '@/components/ui/skeleton';

function SkeletonSection({ large = false }: { large?: boolean }) {
  return (
    <section className="flex flex-col gap-4 border-b border-border/70 pb-7">
      <Skeleton className="h-4 w-32 rounded-md" />
      {large ? (
        <Skeleton className="h-[254px] w-full rounded-lg" />
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full max-w-xl rounded-lg" />
          <Skeleton className="h-3 w-16 self-end rounded-md" />
        </div>
      )}
    </section>
  );
}

function SkeletonCard({ large = false }: { large?: boolean }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-3xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-3 w-56 rounded-md" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full" />
      </div>
      {large ? (
        <Skeleton className="h-36 w-full rounded-lg" />
      ) : (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-12 w-full max-w-xl rounded-lg" />
        </div>
      )}
    </section>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex w-full flex-col rounded-2xl bg-muted/20 p-6">
      <Skeleton className="mb-4 h-3 w-28 rounded-md" />
      <div className="mx-auto flex aspect-[9/19] w-full max-w-[315px] flex-col overflow-hidden rounded-[32px] border-[7px] border-border/70 bg-background">
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <div className="mx-5 border-b border-border/60" />
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3.5">
            <Skeleton className="h-4 w-40 rounded-md" />
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-5/6 rounded-md" />
            <Skeleton className="h-3 w-2/3 rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
      <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3 lg:col-span-7">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="flex flex-col items-center gap-2 rounded-xl border border-border/80 bg-muted/10 p-4"
          >
            <Skeleton className="h-3 w-16 rounded-md" />
            <Skeleton className="h-10 w-14 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TemplateDetailPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 animate-fade-in pb-12"
      aria-busy="true"
      aria-label="Loading template"
    >
      <Skeleton className="h-9 w-36 rounded-md" />

      <header>
        <Skeleton className="h-8 w-72 rounded-md" />
      </header>

      <AnalyticsSkeleton />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
        <div className="flex flex-col gap-7 lg:col-span-7">
          <SkeletonCard />
          <SkeletonSection large />
          <SkeletonCard />
          <SkeletonCard large />
          <Skeleton className="h-10 w-32 self-end rounded-md" />
        </div>

        <div className="flex flex-col lg:col-span-5">
          <PreviewSkeleton />
        </div>
      </div>
    </div>
  );
}
