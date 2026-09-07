import { cn } from '@/lib/utils';
import type { HostBrand } from '@/lib/hostBranding';

export function HostBrandMark({
  brand,
  className,
}: {
  brand: HostBrand | null | undefined;
  className?: string;
}) {
  if (brand === undefined) {
    return <span aria-hidden className={className} />;
  }
  if (brand === null) {
    return <img src="/icon.svg" alt="" className={cn(className, 'dark:invert')} />;
  }
  if (brand.logoUrl) {
    return <img src={brand.logoUrl} alt="" className={cn(className, 'object-contain')} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        className,
        'flex items-center justify-center rounded bg-sidebar-accent text-[0.65em] font-semibold uppercase leading-none',
      )}
    >
      {brand.name.charAt(0)}
    </span>
  );
}
