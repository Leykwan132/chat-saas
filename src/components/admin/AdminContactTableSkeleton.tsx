import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { contactTableGridClass } from './adminContactModel';

export function AdminContactTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="border-b border-dotted border-border/60">
          <div className={cn(contactTableGridClass, 'py-4')}>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mx-auto h-6 w-16 rounded-lg" />
            <Skeleton className="mx-auto h-9 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </>
  );
}
