import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { cn } from '@/lib/utils';

const footerLinks = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
] as const;

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  const { user, signIn } = useAuth();
  const hasSession = Boolean(user);

  const onSignIn = () => {
    void signIn({ state: { returnTo: POST_LOGIN_REDIRECT } });
  };

  return (
    <footer
      className={cn(
        'border-t border-zinc-200 px-5 py-12 dark:border-white/[0.06] sm:px-6',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-zinc-900 dark:text-white"
            >
              <img src="/icon.svg" className="size-6 dark:invert" alt="" />
              Kilobot
            </Link>
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {footerLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-500 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500 dark:text-zinc-400 sm:justify-start">
            <span>Copyright {new Date().getFullYear()} Kilobot</span>
          </div>
          {!hasSession && (
            <button
              type="button"
              onClick={onSignIn}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
