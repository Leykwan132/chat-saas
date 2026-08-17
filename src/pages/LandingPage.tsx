import { useAuth } from '@workos-inc/authkit-react';
import { usePostHog } from '@posthog/react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { LandingHero } from '@/components/landing/LandingHero';
import {
  FeatureShowcaseSection,
  FeaturesSection,
} from '@/components/landing/LandingFeatureSections';
import {
  ComparisonSection,
  UpgradeInboxSection,
} from '@/components/landing/LandingConversionSections';
import { StatsSection } from '@/components/landing/LandingStatsSection';
import '@/styles/landing-page.css';

export default function LandingPage() {
  const { user, signUp } = useAuth();
  const posthog = usePostHog();
  const hasSession = Boolean(user);
  const returnTo = { returnTo: POST_LOGIN_REDIRECT };
  const onSignUp = () => {
    posthog?.capture('signup_cta_clicked', { source: 'landing_page' });
    void signUp({ state: returnTo });
  };

  return (
    <div className="landing-page min-h-[100svh] bg-white font-sans text-zinc-900 antialiased selection:bg-zinc-200 selection:text-zinc-900 dark:bg-[#060606] dark:text-zinc-100 dark:selection:bg-zinc-800 dark:selection:text-zinc-50">
      <SiteHeader />
      <main>
        <LandingHero hasSession={hasSession} onSignUp={onSignUp} />
        <FeaturesSection />
        <FeatureShowcaseSection />
        <ComparisonSection />
        <StatsSection />
        <UpgradeInboxSection onSignUp={onSignUp} />
      </main>
      <SiteFooter />
    </div>
  );
}
