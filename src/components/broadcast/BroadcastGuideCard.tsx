import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export function BroadcastGuideCard({
  tag,
  title,
  onClick,
  to,
  disabled,
  isDark,
}: {
  tag: string;
  title: ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  isDark?: boolean;
}) {
  const cardContent = (
    <>
      <div className="absolute inset-0 z-0 rounded-l-sm rounded-r-[14px] border border-neutral-200/80 bg-white shadow-inner transition-transform duration-500 ease-out group-hover:translate-x-1.5 dark:border-neutral-800/80 dark:bg-[#1a1a1a]" />
      <div
        style={{ transformOrigin: 'left center', transformStyle: 'preserve-3d' }}
        className={cn(
          'absolute inset-0 z-20 flex origin-left flex-col justify-between rounded-l-sm rounded-r-[14px] border py-3.5 pl-[25px] pr-3.5 shadow-md transition-transform duration-500 ease-out group-hover:[transform:rotateY(-24deg)] group-hover:shadow-lg',
          isDark
            ? 'border-neutral-900 bg-neutral-950 text-white dark:bg-black'
            : 'border-neutral-200/80 bg-[#fafafa] text-neutral-800 dark:border-neutral-800/80 dark:bg-[#202020] dark:text-neutral-100',
        )}
      >
        <div className="flex flex-col gap-2">
          <img
            src="/icon.svg"
            className={cn('size-5 shrink-0', isDark ? 'invert' : 'dark:invert')}
            alt="App Logo"
          />
          <span
            className={cn(
              'inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold',
              isDark
                ? 'border-neutral-800/50 bg-neutral-900 text-neutral-400'
                : 'border-neutral-200/30 bg-neutral-100 text-neutral-500 dark:border-neutral-700/30 dark:bg-neutral-800 dark:text-neutral-400',
            )}
          >
            {tag}
          </span>
        </div>
        <h3
          className={cn(
            'text-sm font-semibold leading-tight tracking-tight',
            isDark ? 'text-white' : 'text-neutral-800 dark:text-neutral-100',
          )}
        >
          {title}
        </h3>
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-0 w-[17px] rounded-l-sm bg-gradient-to-r',
            isDark
              ? 'from-white/[0.04] via-transparent to-black/[0.3]'
              : 'from-black/[0.08] via-transparent to-black/[0.12] dark:from-white/[0.03] dark:to-black/[0.2]',
          )}
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-[17px] w-px',
            isDark
              ? 'bg-neutral-800/80'
              : 'bg-neutral-300/60 dark:bg-neutral-800/60',
          )}
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0 left-[18px] w-px',
            isDark
              ? 'bg-white/[0.02]'
              : 'bg-white/50 dark:bg-white/[0.02]',
          )}
        />
      </div>
    </>
  );

  const className = cn(
    'group relative block h-[182px] w-[140px] select-none [perspective:1000px]',
    disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer',
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div onClick={disabled ? undefined : onClick} className={className}>
      {cardContent}
    </div>
  );
}
