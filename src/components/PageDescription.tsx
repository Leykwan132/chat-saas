import { cn } from '@/lib/utils';

export function PageDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'm-0 mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground',
        className,
      )}
    >
      {children}
    </p>
  );
}
