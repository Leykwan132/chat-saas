import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { ArrowRight } from 'lucide-react';
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

  const isActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(to);
  };

  return (
    <>
      <div className="relative z-50 w-full h-auto py-3 sm:py-2 bg-yellow-400 text-zinc-950 text-xs font-normal select-none flex items-center justify-center transition-all duration-300 border-b border-zinc-950/10">
        <div className="px-5 text-center leading-tight">
          <span>Join our Early Adopter Program: <br className="sm:hidden" />Get 3 months of Growth plan free.</span>
          <Link to="/early-adopter-program" className="underline font-semibold hover:opacity-80 inline-flex items-center gap-1.5 ml-2 whitespace-nowrap">
            Learn more <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      <header className={cn(
        'fixed inset-x-0 z-50 transition-all duration-300',
        isScrolled ? 'top-0' : 'top-[56px] sm:top-9',
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
