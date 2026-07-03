import { cn } from '@/lib/utils';

export type PlanPickerDensity = 'default' | 'compact';
export type PlanPickerCompactSpacing = 'default' | 'roomy';

/** Shared shell for pricing cards, add-ons, and comparison tables. */
export const pricingTableShellClass =
  'overflow-hidden rounded-xl border border-border/70 bg-card shadow-none';

export function pricingColumnClass(isEnterprise?: boolean) {
  return cn(
    'flex min-w-0 flex-col',
    isEnterprise && 'bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white',
  );
}

export function pricingColumnDividerClass(isEnterprise?: boolean) {
  return cn(
    'border-border/70',
    isEnterprise ? 'border-zinc-700/60' : 'border-border/70',
  );
}

export function pricingFeatureTextClass(isEnterprise?: boolean, isCompact?: boolean) {
  return cn(
    isCompact ? 'text-sm leading-snug' : 'text-base leading-snug',
    isEnterprise ? 'text-zinc-200' : 'text-foreground',
  );
}

export function pricingDottedUnderlineClass(isEnterprise?: boolean, isCompact?: boolean) {
  return cn(
    'block w-full border-b border-dotted',
    isCompact ? 'mt-1' : 'mt-1.5',
    isEnterprise ? 'border-white/20' : 'border-border/80',
  );
}

export function pricingSectionBorderClass(isEnterprise?: boolean) {
  return cn(isEnterprise ? 'border-zinc-700/60' : 'border-border/60');
}

export const pricingSquareBulletClass =
  'mt-1.5 size-1.5 shrink-0 rounded-[1px] bg-muted-foreground/35';

export function pricingFeatureHoverTriggerClass(className?: string) {
  return cn(
    'cursor-default text-left underline decoration-dotted underline-offset-4 transition-opacity hover:opacity-80',
    className,
  );
}

export function pricingViewAllLinkClass(isEnterprise?: boolean) {
  return cn(
    'text-sm font-medium underline underline-offset-4 transition-colors',
    isEnterprise
      ? 'text-zinc-300 hover:text-white'
      : 'text-foreground/80 hover:text-foreground',
  );
}

export function pricingFeatureGroupTitleClass(isEnterprise?: boolean, isCompact?: boolean) {
  return cn(
    isCompact ? 'text-xs leading-none' : 'text-sm',
    'font-medium',
    isEnterprise ? 'text-zinc-400' : 'text-muted-foreground',
  );
}

export function pricingFeatureRowClass(isCompact?: boolean) {
  return isCompact ? 'h-6 py-0' : 'py-2.5';
}

export function pricingFeatureGroupSpacerClass(isCompact?: boolean) {
  return isCompact ? 'h-6' : undefined;
}
