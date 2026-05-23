import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { ChevronDown } from 'lucide-react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { cn } from '@/lib/utils';

const footerGroups = [
  { title: 'Product', links: ['Inbox', 'Agents', 'Knowledge Base', 'Analytics'] },
  { title: 'Resources', links: ['Docs', 'Playbooks', 'Templates', 'Changelog'] },
  { title: 'Company', links: ['Customers', 'Careers', 'Security', 'Contact'] },
  { title: 'Legal', links: ['Privacy', 'Terms', 'DPA'] },
];

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
      id="enterprise"
      className={cn(
        'border-t border-zinc-200 px-5 py-12 dark:border-white/[0.06] sm:px-6',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link
              to="/"
              className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-zinc-900 dark:text-white"
            >
              <img src="/icon.svg" className="size-6 dark:invert" alt="" />
              Kilobot
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-550 dark:text-zinc-500">
              AI inbox agents for sales teams.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{group.title}</p>
                <div className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <a
                      key={link}
                      href="/#product"
                      className="block text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-500 dark:hover:text-white"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-250 pt-6 dark:border-white/[0.06] sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-550 dark:text-zinc-500 sm:justify-start">
            <span>Copyright {new Date().getFullYear()} Kilobot</span>
            <span className="hidden text-zinc-300 dark:text-zinc-700 sm:inline">/</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-650 dark:border-white/[0.08] dark:text-zinc-400">
              EN
              <ChevronDown className="size-3" />
            </span>
          </div>
          {hasSession ? (
            <Link
              to={POST_LOGIN_REDIRECT}
              className="text-sm text-zinc-550 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="text-sm text-zinc-550 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
