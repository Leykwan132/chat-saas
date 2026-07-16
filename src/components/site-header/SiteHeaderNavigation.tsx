import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import type { SiteHeaderNavLink } from './siteHeaderLinks';

type SiteHeaderNavigationProps = {
  isActive: (to: string) => boolean;
  isHeaderTransparent: boolean;
  navLinks: readonly SiteHeaderNavLink[];
};

export function SiteHeaderNavigation({ isActive, isHeaderTransparent, navLinks }: SiteHeaderNavigationProps) {
  return (
    <nav className="hidden flex-1 items-center justify-center gap-7 text-[15px] md:flex">
      {navLinks.map((link) => (
        link.external ? (
          <a
            key={link.to}
            href={link.to}
            className={cn(
              'transition-colors duration-300',
              isHeaderTransparent
                ? 'text-zinc-300 hover:text-white'
                : 'text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
            )}
          >
            {link.label}
          </a>
        ) : (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              'transition-colors duration-300',
              isActive(link.to)
                ? isHeaderTransparent
                  ? 'text-white font-medium'
                  : 'text-zinc-950 dark:text-white font-medium'
                : isHeaderTransparent
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            )}
          >
            {link.label}
          </Link>
        )
      ))}
    </nav>
  );
}
