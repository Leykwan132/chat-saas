import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { cn } from '@/lib/utils';
import { KILOBOT_DOCS_URL } from '@/lib/docsLinks';

type SiteFooterProps = {
  className?: string;
};

export function SiteFooter({ className }: SiteFooterProps) {
  const { user, signIn } = useAuth();
  const hasSession = Boolean(user);

  const onSignIn = () => {
    void signIn({ state: { returnTo: POST_LOGIN_REDIRECT } });
  };

  const scrollToPageTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  return (
    <footer
      className={cn(
        'border-t border-zinc-200 bg-white px-6 py-16 dark:border-white/[0.06] dark:bg-[#060606] sm:px-8 sm:py-24',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between md:items-start">
          {/* Left Side: Logo & Copyright */}
          <div className="flex flex-col items-start gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-[15px] text-zinc-900 dark:text-white"
            >
              <img src="/icon.svg" className="size-6 dark:invert" alt="" />
              <span className="font-title font-semibold text-[16px] tracking-normal">Kilobot</span>
            </Link>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Copyright &copy; {new Date().getFullYear()} Kilobot. All rights reserved.
            </span>
          </div>

          {/* Right Side: Columns Grouped */}
          <div className="flex flex-wrap gap-x-16 gap-y-12 sm:gap-x-24 md:gap-x-32">
            {/* Column 1: Product & Connect */}
            <div className="flex flex-col gap-10">
              {/* Product Group */}
              <div className="flex flex-col gap-4">
                <span className="font-title text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Product
                </span>
                <nav className="flex flex-col gap-3">
                  <Link
                    to="/pricing"
                    className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/leaderboard"
                    className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Leaderboard
                  </Link>
                  <a
                    href={KILOBOT_DOCS_URL}
                    className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Docs
                  </a>
                  <Link
                    to="/early-adopter-program"
                    className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Early Adopters
                  </Link>
                  <Link
                    to="/contact"
                    onClick={scrollToPageTop}
                    className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Contact
                  </Link>
                </nav>
              </div>

              {/* Connect Group */}
              <div className="flex flex-col gap-4">
                <span className="font-title text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Connect
                </span>
                <nav className="flex flex-col gap-3">
                  <Link
                    to="/contact?intent=demo"
                    onClick={scrollToPageTop}
                    className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Book a demo
                  </Link>
                  <Link
                    to="/contact?intent=support"
                    onClick={scrollToPageTop}
                    className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  >
                    Support
                  </Link>
                  {!hasSession ? (
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="w-fit text-left text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white cursor-pointer font-normal"
                    >
                      Sign in
                    </button>
                  ) : (
                    <Link
                      to={POST_LOGIN_REDIRECT}
                      className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                    >
                      Dashboard
                    </Link>
                  )}
                </nav>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <span className="font-title text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Security &amp; Legal
              </span>
              <nav className="flex flex-col gap-3">
                <Link
                  to="/privacy"
                  className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                >
                  Privacy
                </Link>
                <Link
                  to="/terms"
                  className="text-base text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                >
                  Terms of Service
                </Link>
              </nav>
            </div>
          </div>
        </div>


      </div>
    </footer>
  );
}
