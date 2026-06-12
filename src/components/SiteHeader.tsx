import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { ArrowRight, Menu, User, LogIn, UserPlus } from 'lucide-react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const { user, signIn, signUp } = useAuth();
  const hasSession = Boolean(user);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const returnTo = { state: { returnTo: POST_LOGIN_REDIRECT } };
  const onSignIn = () => {
    void signIn(returnTo);
    setIsOpen(false);
  };
  const onSignUp = () => {
    void signUp(returnTo);
    setIsOpen(false);
  };

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Leaderboard', to: '/leaderboard' },
  ] as const;

  const isActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 dark:border-white/[0.06] bg-white/75 dark:bg-[#060606]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-zinc-950 dark:text-white">
          <img src="/icon.svg" className="size-6 dark:invert" alt="" />
          Kilobot
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-7 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={
                isActive(link.to)
                  ? 'transition-colors text-zinc-950 dark:text-white font-medium'
                  : 'transition-colors text-zinc-650 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ModeToggle />

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {hasSession ? (
              <Link
                to={POST_LOGIN_REDIRECT}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white px-3.5 py-2 text-sm font-medium dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90"
              >
                Dashboard
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-md px-3 py-2 text-sm font-medium text-zinc-650 transition-colors hover:text-zinc-900 dark:text-zinc-350 dark:hover:text-white cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={onSignUp}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white px-3.5 py-2 text-sm font-medium dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90 cursor-pointer"
                >
                  Get started
                  <ArrowRight className="size-4" />
                </button>
              </>
            )}
          </div>

          {/* Mobile Hamburg Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
              >
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="flex flex-col justify-between w-full sm:max-w-sm h-full p-8 pt-16 bg-white dark:bg-[#060606] border-l border-zinc-200 dark:border-white/[0.06] text-zinc-950 dark:text-zinc-50"
            >
              <div className="flex flex-col gap-6">
                <nav className="flex flex-col">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "py-3.5 text-base font-medium transition-colors border-b border-zinc-100 dark:border-white/[0.03] hover:text-zinc-950 dark:hover:text-white flex items-center justify-between",
                        isActive(link.to)
                          ? "text-zinc-950 dark:text-white font-semibold"
                          : "text-zinc-500 dark:text-zinc-400"
                      )}
                    >
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="flex flex-col gap-4 mt-auto pt-6 border-t border-zinc-150 dark:border-white/[0.06]">
                {hasSession ? (
                  <Link
                    to={POST_LOGIN_REDIRECT}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white transition-colors"
                  >
                    <User className="size-4.5 text-zinc-400 dark:text-zinc-500" />
                    <span>Account / Dashboard</span>
                  </Link>
                ) : (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="flex items-center gap-3 w-full py-2 text-left text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <LogIn className="size-4.5 text-zinc-400 dark:text-zinc-500" />
                      <span>Sign in</span>
                    </button>
                    <button
                      type="button"
                      onClick={onSignUp}
                      className="flex items-center gap-3 w-full py-2 text-left text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <UserPlus className="size-4.5 text-zinc-400 dark:text-zinc-500" />
                      <span>Get started</span>
                    </button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
