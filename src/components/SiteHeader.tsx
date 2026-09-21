import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { toast } from 'sonner';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { SiteHeaderActions } from '@/components/site-header/SiteHeaderActions';
import { SiteHeaderBrand } from '@/components/site-header/SiteHeaderBrand';
import { SiteHeaderNavigation } from '@/components/site-header/SiteHeaderNavigation';
import { siteHeaderNavLinks } from '@/components/site-header/siteHeaderLinks';
import { cn } from '@/lib/utils';

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const { user, signIn, signUp } = useAuth();
  const hasSession = Boolean(user);
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHeaderTransparent = transparent && !isScrolled;

  const returnTo = { state: { returnTo: POST_LOGIN_REDIRECT } };
  const onSignIn = () => {
    void signIn(returnTo);
    setIsOpen(false);
  };
  const onSignUp = () => {
    void signUp(returnTo);
    setIsOpen(false);
  };

  const copyPromoCode = async () => {
    try {
      await navigator.clipboard.writeText('STARTER1');
      toast.success('Code copied!');
    } catch {
      toast.error('Unable to copy code');
    }
  };

  const isActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => void copyPromoCode()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void copyPromoCode();
          }
        }}
        aria-label="Copy promotion code STARTER1"
        className="relative z-50 flex min-h-10 w-full cursor-pointer items-center justify-center border-b border-zinc-950/10 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 px-5 py-1 text-center text-xs text-zinc-950 transition-all duration-300 hover:brightness-[0.98]"
      >
        <span className="flex w-full items-center justify-center text-center leading-tight">
          <span className="font-normal">Use code <span className="font-bold tracking-wide">STARTER1</span> for 99% off your first 3 months (Starter Plan)</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate('/pricing');
            }}
            onKeyDown={(event) => event.stopPropagation()}
            className="ml-2 whitespace-nowrap rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Learn more →
          </button>
        </span>
      </div>

      <header className={cn(
        'fixed inset-x-0 z-50 transition-all duration-300',
        isScrolled ? 'top-0' : 'top-10 sm:top-10',
        isHeaderTransparent
          ? 'border-transparent bg-transparent py-2'
          : 'border-b border-zinc-200 dark:border-white/[0.06] bg-white/75 dark:bg-[#060606]/75 backdrop-blur-xl py-0'
      )}>
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-around gap-4 px-5 sm:px-6 md:px-8 lg:px-10">
        <SiteHeaderBrand isHeaderTransparent={isHeaderTransparent} />
        <SiteHeaderNavigation
          isActive={isActive}
          isHeaderTransparent={isHeaderTransparent}
          navLinks={siteHeaderNavLinks}
        />
        <SiteHeaderActions
          hasSession={hasSession}
          isActive={isActive}
          isHeaderTransparent={isHeaderTransparent}
          isOpen={isOpen}
          navLinks={siteHeaderNavLinks}
          onSignIn={onSignIn}
          onSignUp={onSignUp}
          setIsOpen={setIsOpen}
        />
      </div>
    </header>
    </>
  );
}
