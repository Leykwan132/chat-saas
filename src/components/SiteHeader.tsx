import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { Copy } from 'lucide-react';
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
      <button
        type="button"
        onClick={() => void copyPromoCode()}
        aria-label="Copy promotion code STARTER1"
        className="relative z-50 flex min-h-10 w-full cursor-pointer items-center justify-center border-b border-zinc-950/10 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 px-5 py-1 text-center text-xs text-zinc-950 transition-all duration-300 hover:brightness-[0.98]"
      >
        <span className="flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center leading-tight">
          <span className="font-normal">99% off for your first 3 months. Use code <span className="inline-flex translate-y-[3px] items-center font-bold tracking-wide"><Copy className="ml-1 mr-1 size-3" />STARTER1</span></span>
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-zinc-950/20 bg-white/40 px-2 py-0.5 font-medium">See more →</span>
        </span>
      </button>

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
