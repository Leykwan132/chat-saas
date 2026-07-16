import type { Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router';
import { ArrowRight, LogIn, Menu, User } from 'lucide-react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { SiteHeaderNavLink } from './siteHeaderLinks';

type SiteHeaderActionsProps = {
  hasSession: boolean;
  isActive: (to: string) => boolean;
  isHeaderTransparent: boolean;
  isOpen: boolean;
  navLinks: readonly SiteHeaderNavLink[];
  onSignIn: () => void;
  onSignUp: () => void;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

export function SiteHeaderActions({
  hasSession,
  isActive,
  isHeaderTransparent,
  isOpen,
  navLinks,
  onSignIn,
  onSignUp,
  setIsOpen,
}: SiteHeaderActionsProps) {
  return (
    <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
      <div className="hidden md:block">
        <ModeToggle transparent={isHeaderTransparent} />
      </div>

      <div className="hidden items-center gap-2 sm:gap-3 md:flex">
        {hasSession ? (
          <Link
            to={POST_LOGIN_REDIRECT}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[15px] font-medium transition-all duration-300 hover:opacity-90',
              isHeaderTransparent
                ? 'bg-white text-zinc-900 hover:bg-white/90 shadow-sm'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)]'
            )}
          >
            Dashboard
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={onSignIn}
              className={cn(
                'cursor-pointer rounded-md px-3 py-2 text-[15px] font-medium transition-colors duration-300',
                isHeaderTransparent
                  ? 'text-zinc-300 hover:text-white'
                  : 'text-zinc-650 hover:text-zinc-900 dark:text-zinc-350 dark:hover:text-white'
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onSignUp}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-2 text-[15px] font-medium transition-all duration-300',
                isHeaderTransparent
                  ? 'bg-white text-zinc-900 hover:bg-white/90 shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)]'
              )}
            >
              Start for free
            </button>
          </>
        )}
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'md:hidden hover:bg-zinc-100 dark:hover:bg-white/[0.06]',
              isHeaderTransparent ? 'text-white hover:bg-white/10' : 'text-zinc-600 dark:text-zinc-400'
            )}
          >
            <Menu className="size-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="flex h-full w-full flex-col justify-between border-l border-zinc-200 bg-white p-8 pt-16 text-zinc-950 dark:border-white/[0.06] dark:bg-[#060606] dark:text-zinc-50 sm:max-w-sm"
        >
          <div className="absolute left-4 top-4">
            <ModeToggle />
          </div>
          <div className="flex flex-col gap-6">
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                link.external ? (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between border-b border-zinc-100 py-3.5 text-base font-medium text-zinc-500 transition-colors hover:text-zinc-950 dark:border-white/[0.03] dark:text-zinc-400 dark:hover:text-white"
                  >
                    <span>{link.label}</span>
                  </a>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      'flex items-center justify-between border-b border-zinc-100 py-3.5 text-base font-medium transition-colors hover:text-zinc-950 dark:border-white/[0.03] dark:hover:text-white',
                      isActive(link.to) ? 'text-zinc-950 font-semibold dark:text-white' : 'text-zinc-500 dark:text-zinc-400'
                    )}
                  >
                    <span>{link.label}</span>
                  </Link>
                )
              ))}
            </nav>
          </div>

          <div className="mt-auto flex flex-col gap-4 border-t border-zinc-150 pt-6 dark:border-white/[0.06]">
            {hasSession ? (
              <Link
                to={POST_LOGIN_REDIRECT}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              >
                <User className="size-4.5 text-zinc-400 dark:text-zinc-500" />
                <span>Account / Dashboard</span>
              </Link>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="flex w-full cursor-pointer items-center gap-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                >
                  <LogIn className="size-4.5 text-zinc-400 dark:text-zinc-500" />
                  <span>Sign in</span>
                </button>
                <button
                  type="button"
                  onClick={onSignUp}
                  className="flex w-full cursor-pointer py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                >
                  Start for free
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
