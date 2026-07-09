import { Link } from 'react-router';
import { cn } from '@/lib/utils';

type SiteHeaderBrandProps = {
  isHeaderTransparent: boolean;
};

export function SiteHeaderBrand({ isHeaderTransparent }: SiteHeaderBrandProps) {
  return (
    <div className="flex flex-1 items-center justify-start">
      <Link
        to="/"
        className={cn(
          'flex items-center gap-2 text-[15px] transition-colors duration-300',
          isHeaderTransparent ? 'text-white' : 'text-zinc-950 dark:text-white'
        )}
      >
        <img
          src="/icon.svg"
          className={cn('size-7 transition-all duration-300', isHeaderTransparent ? 'invert' : 'dark:invert')}
          alt=""
        />
        <span className="font-title font-semibold text-[20px] tracking-normal">Kilobot</span>
      </Link>
    </div>
  );
}
