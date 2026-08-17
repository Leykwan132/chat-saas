import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { ArrowRight } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { SiteFooter } from '@/components/SiteFooter';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { reportGoogleAdsConversion } from '@/lib/googleAdsConversion';

type BlogPostLayoutProps = {
  title: string;
  date: string;
  category?: string;
  children: ReactNode;
};

export function BlogPostLayout({
  title,
  date,
  category = 'Product',
  children,
}: BlogPostLayoutProps) {
  const { user, signIn, signUp } = useAuth();
  const hasSession = Boolean(user);
  const returnTo = { state: { returnTo: POST_LOGIN_REDIRECT } };

  const onSignIn = () => void signIn(returnTo);
  const onSignUp = () => {
    reportGoogleAdsConversion(() => {
      void signUp(returnTo);
    });
  };

  return (
    <div className="flex min-h-[100svh] flex-col justify-between bg-white font-sans text-zinc-900 antialiased selection:bg-black/10 selection:text-zinc-950 dark:bg-[#060606] dark:text-zinc-100 dark:selection:bg-white/20 dark:selection:text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#060606]/80">
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
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:bg-zinc-800 hover:opacity-90 dark:bg-white dark:text-[#050505]"
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
                  className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:bg-zinc-800 hover:opacity-90 dark:bg-white dark:text-[#050505]"
                >
                  Start for free
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-32">
        <header className="mb-12 space-y-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            <span className="text-zinc-400 dark:text-zinc-600">Blog</span>
            <span className="mx-2 text-zinc-300 dark:text-zinc-700">/</span>
            <span>{category}</span>
          </p>
          <h1 className="font-title text-balance text-[2rem] font-normal leading-[1.15] tracking-tight text-zinc-950 sm:text-[2.75rem] dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500">{date}</p>
        </header>
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
