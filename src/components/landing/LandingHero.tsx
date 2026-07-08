import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { BlurFade } from '@/components/ui/blur-fade';
import { LandingAppPreview } from './LandingAppPreview';

const LANDING_MOBILE_IMAGE = 'https://storage.kilobot.app/Kilobot%20Landing%20-%20Mobile%20-%202.svg';

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
    'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 sm:w-auto sm:flex-none sm:px-6 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100';

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
          <h1 className="font-title text-balance text-[32px] font-normal leading-tight tracking-normal text-zinc-950 sm:text-[38px] md:text-[52px] dark:text-white">
            AI Agent for Sales <br />
            in 5 minutes
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-xs leading-relaxed text-zinc-600 sm:text-sm md:text-base dark:text-zinc-400">
            Kilobot puts AI agents in your messaging inbox to qualify leads, answer questions, and close deals 24/7.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-row items-center justify-center gap-3 sm:w-auto sm:gap-3.5">
            <PrimaryCta hasSession={hasSession} onSignUp={onSignUp} label="Start for free" />
            <Link
              to="/contact?intent=demo"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-zinc-200 bg-transparent px-4 text-sm font-semibold text-zinc-950 transition-all hover:bg-zinc-50 sm:w-auto sm:flex-none sm:px-6 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
            >
              Book a demo
            </Link>
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
