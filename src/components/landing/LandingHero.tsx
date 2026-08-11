import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { BlurFade } from '@/components/ui/blur-fade';
import { LandingAnnouncementPill } from './LandingAnnouncementPill';
import { LandingAppPreview } from './LandingAppPreview';

const LANDING_MOBILE_IMAGE = 'https://storage.kilobot.app/mob-cover-image.png';

function PrimaryCta({
  hasSession,
  onSignUp,
  label,
}: {
  hasSession: boolean;
  onSignUp: () => void;
  label: string;
}) {
  const className =
    'inline-flex h-11 w-[240px] flex-none items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 sm:w-auto dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100';

  if (hasSession) {
    return (
      <Link to={POST_LOGIN_REDIRECT} className={className}>
        Dashboard
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onSignUp} className={className}>
      {label}
    </button>
  );
}

export function LandingHero({
  hasSession,
  onSignUp,
}: {
  hasSession: boolean;
  onSignUp: () => void;
}) {
  return (
    <section className="w-full bg-white px-5 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 dark:bg-[#060606]">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto flex min-h-[60svh] max-w-3xl flex-col items-center justify-center py-16 text-center sm:min-h-[70svh]">
          <LandingAnnouncementPill />
          <h1 className="font-title text-[28px] font-normal leading-tight tracking-normal text-zinc-950 sm:text-[38px] md:text-[52px] dark:text-white">
            AI Agent for Every Inbox
          </h1>
          <p className="mt-3 w-[320px] max-w-full text-pretty text-[15px] leading-[22px] text-zinc-400 sm:mx-auto sm:w-full sm:max-w-2xl sm:text-lg sm:leading-relaxed md:text-xl dark:text-zinc-500">
            <span className="block sm:hidden">Handle customer support and sales in one place.</span>
            <span className="hidden sm:block">
              <span className="block">Handle customer support and sales conversations in one place.</span>
              <span className="block">No complex setup—get started in just 5 minutes.</span>
            </span>
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-3.5">
            <PrimaryCta hasSession={hasSession} onSignUp={onSignUp} label="Start for free" />
            <a
              className="inline-flex h-11 w-[240px] flex-none items-center justify-center rounded-full border border-zinc-200 bg-transparent px-6 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-50 sm:w-auto dark:border-white/20 dark:text-white dark:hover:bg-white/5"
              href="https://wa.me/601167389886?text=Hey%2C%20I%20want%20to%20learn%20more%20about%20Kilobot."
              target="_blank"
              rel="noopener noreferrer"
            >
              Try Live Demo
            </a>
          </div>
        </div>
        <div id="product-demo" className="mt-14 w-full scroll-mt-14 sm:mt-16">
          <BlurFade inView>
            <img
              src={LANDING_MOBILE_IMAGE}
              alt="Kilobot Inbox Sales Interface Demonstration"
              className="h-auto w-full rounded-lg bg-white shadow-[0_0_15px_rgba(0,0,0,0.07)] md:hidden dark:border-white/10 dark:bg-white dark:shadow-[0_0_15px_rgba(0,0,0,0.35)]"
            />
            <LandingAppPreview hasSession={hasSession} onSignUp={onSignUp} />
          </BlurFade>
        </div>
      </div>
    </section>
  );
}
