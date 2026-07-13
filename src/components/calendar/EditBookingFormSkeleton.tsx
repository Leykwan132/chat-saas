import { Skeleton } from '@/components/ui/skeleton';

const FieldSkeleton = ({ height = 'h-10' }: { height?: string }) => (
  <div className="grid gap-2">
    <Skeleton className="h-3 w-24 rounded-md" />
    <Skeleton className={`${height} w-full rounded-md`} />
  </div>
);

export function EditBookingFormSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {[0, 1].map((column) => (
        <div key={column} className="flex flex-col gap-6">
          <Skeleton className="h-4 w-32 rounded-md" />
          <FieldSkeleton />
          <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <FieldSkeleton height="h-24" />
        </div>
      ))}
    </div>
  );
}
