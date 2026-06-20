import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { ArrowRight } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { SiteFooter } from '@/components/SiteFooter';
import { POST_LOGIN_REDIRECT } from '@/constants';

type LegalDocumentLayoutProps = {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
};

export function LegalDocumentLayout({ title, lastUpdated, children }: LegalDocumentLayoutProps) {
  const { user, signIn, signUp } = useAuth();
  const hasSession = Boolean(user);
  const returnTo = { state: { returnTo: POST_LOGIN_REDIRECT } };

  const onSignIn = () => void signIn(returnTo);
  const onSignUp = () => void signUp(returnTo);

  return (
    <div className="flex min-h-[100svh] flex-col justify-between bg-zinc-50 font-sans text-zinc-900 antialiased selection:bg-black/10 selection:text-zinc-950 dark:bg-[#060606] dark:text-zinc-100 dark:selection:bg-white/20 dark:selection:text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/75 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#060606]/75">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-[15px] text-zinc-900 dark:text-white"
          >
            <img src="/icon.svg" className="size-6 dark:invert" alt="" />
            <span className="font-title font-semibold text-[16px] tracking-normal">Kilobot</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-zinc-600 dark:text-zinc-400 md:flex">
            <Link to="/" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              Home
            </Link>
            <Link to="/pricing" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              Pricing
            </Link>
            <Link to="/leaderboard" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              Leaderboard
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:block">
              <ModeToggle />
            </div>
            {hasSession ? (
              <Link
                to={POST_LOGIN_REDIRECT}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:bg-zinc-800 hover:opacity-90 dark:bg-white dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)]"
              >
                Dashboard
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={onSignUp}
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:bg-zinc-800 hover:opacity-90 dark:bg-white dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)]"
                >
                  Start for free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28">
        <header className="mb-10 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
            {title}
          </h1>
          {lastUpdated ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">Last updated {lastUpdated}</p>
          ) : null}
        </header>
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
