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
        className="relative z-50 flex min-h-10 w-full cursor-pointer items-center justify-center border-b border-white/20 bg-gradient-to-r from-[#eb0000] via-[#95008a] to-[#3300fc] px-4 py-1 text-center text-xs text-white transition-all duration-300 hover:brightness-[0.98] sm:px-5"
      >
        <span className="flex w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center leading-tight">
          <span className="font-semibold">Enjoy Starter for only RM1 for your first 3 months.</span>
          <span className="font-medium">Use code</span>
          <span className="inline-flex translate-y-[3px] items-center gap-1 font-bold tracking-wide"><Copy className="size-3" />STARTER1</span>
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
