import { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  ArrowRight,
  Play,
  Users,
  Calendar,
  FileText,
  Database,
  Globe,
  Check,
  X,
  Target,
  UserPlus,
  Megaphone,
  Shield,
  MessageCircle,
} from 'lucide-react';
import { SiGoogle, SiMeta, SiStripe, SiSlack, SiAirbnb, SiShopify } from 'react-icons/si';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BlurFade } from '@/components/ui/blur-fade';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Marquee } from '@/components/ui/marquee';



function PrimaryCta({
  hasSession,
  onSignUp,
  label,
}: {
  hasSession: boolean;
  onSignUp: () => void;
  label: string;
}) {
  if (hasSession) {
    return (
      <Link
        to={POST_LOGIN_REDIRECT}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white hover:bg-zinc-100 text-zinc-950 px-6 text-sm font-semibold transition-colors sm:w-auto shadow-md"
      >
        Go to dashboard
        <ArrowRight className="size-4" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onSignUp}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white hover:bg-zinc-100 text-zinc-950 px-6 text-sm font-semibold transition-colors sm:w-auto shadow-md"
    >
      {label}
      <ArrowRight className="size-4" />
    </button>
  );
}

const COMPANY_LOGOS = [
  { name: 'Google', icon: SiGoogle },
  { name: 'Meta', icon: SiMeta },
  { name: 'Stripe', icon: SiStripe },
  { name: 'Slack', icon: SiSlack },
  { name: 'Airbnb', icon: SiAirbnb },
  { name: 'Shopify', icon: SiShopify },
];

function AppDemoSection() {
  return (
    <section className="bg-white dark:bg-[#060606] pt-16 pb-10 px-6 sm:pt-20 sm:pb-14 sm:px-8 scroll-mt-14 flex flex-col gap-10 sm:gap-12">
      <div className="mx-auto max-w-6xl w-full">
        <BlurFade inView>
          <div className="relative mx-auto overflow-hidden rounded-2xl border-[6px] sm:border-[8px] border-white bg-white shadow-[0_0_15px_rgba(0,0,0,0.07)] dark:border-white dark:bg-white dark:shadow-[0_0_15px_rgba(0,0,0,0.35)]">
            {/* Aspect ratio container */}
            <div className="relative aspect-[16/10] w-full">
              <img
                src="/video_placeholder.png"
                alt="Kilobot Inbox Sales Interface Demonstration"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.01]"
              />
              {/* Subtle play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20 group cursor-pointer">
                <div className="flex size-16 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                  <Play className="size-6 fill-current ml-0.5" />
                </div>
              </div>
            </div>
          </div>
        </BlurFade>
      </div>
      <LogoMarquee logos={COMPANY_LOGOS} />
    </section>
  );
}

function LogoMarquee({ logos }: { logos?: Array<{ name: string; icon: React.ComponentType<{ className?: string }> }> }) {
  if (!logos || logos.length === 0) return null;

  return (
    <div className="w-full overflow-hidden py-0 bg-transparent">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative w-full overflow-hidden">
          {/* Gradients to fade out edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 md:w-16 bg-gradient-to-r from-white dark:from-[#060606] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 md:w-16 bg-gradient-to-l from-white dark:from-[#060606] to-transparent" />

          {/* Marquee component */}
          <Marquee className="[--duration:40s] [--gap:4rem] p-0">
            {logos.map((logo, index) => {
              const Icon = logo.icon;
              return (
                <div key={index} className="flex items-center gap-2.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-350 transition-colors">
                  <Icon className="size-5 md:size-7" />
                  <span className="text-sm md:text-lg font-bold tracking-tight">{logo.name}</span>
                </div>
              );
            })}
          </Marquee>
        </div>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section className="bg-white dark:bg-[#060606] py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Transform Your Inbox"
            className="mx-auto text-center items-center"
          />
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: AI Lead Temperature */}
          <div className="flex flex-col justify-between rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40 p-8 min-h-[440px]">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">
                AI Agent
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Auto lead labeling, summaries, auto-booking with date and lead assignment.
              </p>
            </div>
            
            {/* Graphic 1: Lead Temperature Benchmark */}
            <div className="mt-8 flex flex-col gap-4 w-full px-1">
              {/* Hot Lead */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-orange-600 dark:text-orange-400">
                    <span className="size-2 rounded-full bg-orange-500 animate-ping" />
                    Hot Lead 🔥
                  </span>
                  <span className="text-orange-600 dark:text-orange-400 font-bold">95°C</span>
                </div>
                <div className="flex gap-[3px]">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="h-4 w-1.5 bg-orange-500 rounded-sm" />
                  ))}
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-4 w-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                  ))}
                </div>
              </div>

              {/* Cold Lead */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 font-semibold">
                    <span className="size-2 rounded-full bg-blue-500" />
                    Cold Lead ❄️
                  </span>
                  <span className="text-blue-500 dark:text-blue-400 font-mono">15°C</span>
                </div>
                <div className="flex gap-[3px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-4 w-1.5 bg-blue-400 rounded-sm" />
                  ))}
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="h-4 w-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Knowledge Base Sync */}
          <div className="flex flex-col justify-between rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40 p-8 min-h-[440px]">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">
                Knowledge Base
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Sync PDFs, websites, or any text info.
              </p>
            </div>

            {/* Graphic 2: Knowledge base source connections */}
            <div className="mt-8 relative flex items-center justify-center h-40 w-full">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                {/* Left line */}
                <path d="M 15 15 C 15 50, 50 50, 50 75" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="2 2" />
                {/* Middle line */}
                <path d="M 50 15 L 50 75" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="2 2" />
                {/* Right line */}
                <path d="M 85 15 C 85 50, 50 50, 50 75" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="2 2" />
              </svg>

              {/* Chips */}
              <div className="absolute left-[15%] top-0 -translate-x-1/2 z-10 flex size-12 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] shadow-md transition-transform hover:-translate-y-1">
                <FileText className="text-blue-500 size-6" />
              </div>
              <div className="absolute left-[50%] top-0 -translate-x-1/2 z-10 flex size-12 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] shadow-md transition-transform hover:-translate-y-1">
                <Database className="text-emerald-500 size-6" />
              </div>
              <div className="absolute left-[85%] top-0 -translate-x-1/2 z-10 flex size-12 items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] shadow-md transition-transform hover:-translate-y-1">
                <Globe className="text-violet-500 size-6" />
              </div>

              {/* Center receiver (Kilobot core logo) */}
              <div className="absolute left-[50%] bottom-4 -translate-x-1/2 z-10 flex size-10 items-center justify-center rounded-full bg-zinc-950 dark:bg-white border border-zinc-800 dark:border-zinc-200 shadow-md">
                <img src="/icon.svg" className="size-5 invert dark:invert-0" alt="" />
              </div>
            </div>
          </div>

          {/* Card 3: Custom LLM Routing */}
          <div className="flex flex-col justify-between rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40 p-8 min-h-[440px]">
            <div>
              <h3 className="text-lg font-semibold text-zinc-950 dark:text-white mb-2">
                Custom Models
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Choose and deploy custom models on your own.
              </p>
            </div>

            {/* Graphic 3: Custom model routing chart */}
            <div className="mt-8 flex flex-col w-full px-1">
              <div className="relative h-28 w-full">
                {/* Y Axis line / Grid lines */}
                <div className="absolute inset-y-0 left-0 w-px bg-zinc-200 dark:bg-zinc-800" />
                <div className="absolute bottom-0 inset-x-0 h-px bg-zinc-200 dark:bg-zinc-800" />
                
                {/* Chart curves */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Top Line (GPT-4o) */}
                  <path d="M 0 90 Q 45 70 85 10" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-300 dark:text-zinc-700" />
                  {/* Middle Line (Claude 3.5) */}
                  <path d="M 0 90 Q 45 80 85 35" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 dark:text-zinc-600" strokeDasharray="3 3" />
                  {/* Bottom Line (Custom Model) */}
                  <path d="M 0 90 Q 45 88 85 60" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500" />
                  
                  {/* Ending point indicators */}
                  <circle cx="85" cy="10" r="2" className="fill-zinc-400 dark:fill-zinc-600" />
                  <circle cx="85" cy="35" r="2" className="fill-zinc-500" />
                  <circle cx="85" cy="60" r="2" className="fill-emerald-500" />
                </svg>

                {/* Legend badges at ends of lines */}
                <div className="absolute left-[88%] top-[10%] text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded -translate-y-1/2">GPT-4o</div>
                <div className="absolute left-[88%] top-[35%] text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded -translate-y-1/2">Claude 3.5</div>
                <div className="absolute left-[88%] top-[60%] text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded -translate-y-1/2">Custom LLM</div>
              </div>
              <div className="flex justify-between items-center mt-2.5 text-[9px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-550 uppercase">
                <span>100 chats</span>
                <span>1k chats</span>
                <span>10k chats</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type FeatureItem = {
  id: string;
  tabLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  heading: string;
  description: string;
  visual: React.ReactNode;
};

const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: 'humanLike',
    tabLabel: 'Human Like Response',
    icon: MessageCircle,
    heading: 'Human Response',
    description: 'Warm, natural replies that match your brand tone perfectly.',
    visual: (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 p-4 font-sans">
        <div className="flex flex-col flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.05] overflow-hidden">
          <div className="bg-[#075e54] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
            <span>Customer Chat</span>
            <span className="size-2 rounded-full bg-emerald-400" />
          </div>
          <div className="p-3 space-y-3 flex-1 overflow-y-auto text-xs leading-normal">
            <div className="bg-white dark:bg-zinc-850 p-2.5 rounded-lg max-w-[80%] border border-zinc-200/50 dark:border-zinc-800">
              Hey, do you have the Voyager Jacket in Medium? Also wondering about shipping times.
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 p-2.5 rounded-lg max-w-[80%] ml-auto border border-emerald-100 dark:border-emerald-900/30">
              <p className="font-semibold text-[10px] mb-0.5 text-emerald-700 dark:text-emerald-400">Kilobot</p>
              Hi! Yes, we have 4 in Medium right now. Standard shipping is 3–5 days, or express in 1–2. Want me to hold one for you?
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'scoring',
    tabLabel: 'Lead Scoring',
    icon: Target,
    heading: 'Lead Scoring',
    description: 'Real-time analysis to score customer intent, budget, and urgency.',
    visual: (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 p-5 font-sans text-xs">
        <div className="flex flex-col flex-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.05] p-4 justify-center gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 font-semibold text-orange-600 dark:text-orange-400">
                <span className="size-2 rounded-full bg-orange-500 animate-ping" />
                Hot Lead
              </span>
              <span className="text-orange-600 dark:text-orange-400 font-bold">Score 92</span>
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: 22 }).map((_, i) => (
                <div key={i} className="h-3.5 w-1.5 bg-orange-500 rounded-sm" />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-3.5 w-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-blue-500 dark:text-blue-400">Warm Lead</span>
              <span className="text-blue-500 dark:text-blue-400 font-mono">Score 54</span>
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-3.5 w-1.5 bg-blue-400 rounded-sm" />
              ))}
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-3.5 w-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
              ))}
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded-lg border border-orange-100/50 dark:border-orange-900/20 text-[10px] text-orange-700 dark:text-orange-400">
            <strong>Signals:</strong> Budget confirmed · Demo requested · Replied within 5 min
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'assignment',
    tabLabel: 'Lead Assignment',
    icon: Users,
    heading: 'Lead Assignment',
    description: 'Route leads instantly based on territory, workload, or skills.',
    visual: (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 p-6 font-sans">
        <div className="flex flex-col flex-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.05] p-4 shadow-sm text-xs justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-zinc-100 dark:border-white/[0.04]">
              <span className="font-bold text-zinc-900 dark:text-white">Lead Profile</span>
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold">Qualified</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-zinc-400">Prospect:</span><span className="font-medium">Lena Chen</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Region:</span><span className="font-medium">APAC</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Rule:</span><span className="font-medium text-blue-600">Territory → Workpool #2</span></div>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-100 dark:border-white/[0.04] flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-blue-500 animate-ping" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Assigning to Alex Tan...</span>
            </div>
            <span className="text-[10px] font-mono bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded">Round-robin</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'calendar',
    tabLabel: 'Auto Booking',
    icon: Calendar,
    heading: 'Auto Booking',
    description: 'Share availability and let customers book meetings instantly in-chat.',
    visual: (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 p-4 font-sans text-xs">
        <div className="flex flex-col flex-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.05] overflow-hidden">
          <div className="border-b border-zinc-150 dark:border-white/[0.04] bg-zinc-50 dark:bg-zinc-800/50 p-3 flex justify-between items-center">
            <span className="font-bold text-zinc-900 dark:text-white">Auto-book a Demo Slot</span>
            <span className="text-[10px] text-zinc-400">GMT+8</span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3.5 flex-1 items-center">
            {['9:30 AM', '11:00 AM', '2:30 PM'].map((time, idx) => (
              <div
                key={time}
                className={cn(
                  'border rounded-lg p-2.5 text-center transition-all cursor-pointer font-medium',
                  idx === 1
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                )}
              >
                {time}
                {idx === 1 && <div className="text-[8px] mt-0.5 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Booked</div>}
              </div>
            ))}
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 border-t border-zinc-150 dark:border-white/[0.04] text-center text-[10px] text-zinc-500">
            Calendar invite sent · Reminder scheduled for 1 hour before
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'escalation',
    tabLabel: 'Human Escalation',
    icon: UserPlus,
    heading: 'Human Escalation',
    description: 'Detect when a human is needed and escalate with full conversation context.',
    visual: (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 p-5 font-sans text-xs">
        <div className="flex flex-col flex-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.05] p-4 justify-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-lg p-3">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-[11px] mb-1">Escalation triggered</p>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">Customer asked for pricing on enterprise plan</p>
          </div>
          <div className="flex items-center justify-center gap-2 py-1">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            <ArrowRight className="size-3.5 text-zinc-400 rotate-90" />
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
            <div className="size-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">SR</div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-white">Sarah Reyes joined the chat</p>
              <p className="text-[10px] text-zinc-500">Full conversation history attached</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'outreach',
    tabLabel: 'Broadcast',
    icon: Megaphone,
    heading: 'Broadcast Outreach',
    description: 'Send broadcast campaigns and schedule proactive follow-up messages.',
    visual: (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 p-5 font-sans text-xs">
        <div className="flex flex-col flex-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.05] p-4 justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="size-5 rounded-md bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">1</span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">Broadcast: Summer Promo</p>
                <p className="text-[10px] text-zinc-500">Sent to 1,240 qualified leads</p>
              </div>
            </div>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 ml-2.5" />
            <div className="flex items-center gap-2">
              <span className="size-5 rounded-md bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">2</span>
              <div>
                <p className="font-semibold text-zinc-900 dark:text-white">Follow-up: No reply in 48h</p>
                <p className="text-[10px] text-zinc-500">Auto-send reminder template</p>
              </div>
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100/40 dark:border-emerald-900/20 mt-4 text-[10px] text-emerald-700 dark:text-emerald-400">
            <strong>Results:</strong> 38% open rate · 42% re-engagement · 12 deals closed
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'access',
    tabLabel: 'Role Based Access Control',
    icon: Shield,
    heading: 'Role Based Access Control',
    description: 'Control team access with custom roles and channel permissions.',
    visual: (
      <div className="flex flex-col h-full bg-slate-50 dark:bg-zinc-950 p-5 font-sans text-xs">
        <div className="flex flex-col flex-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.05] p-4 justify-center gap-2">
          {[
            { role: 'Owner', access: 'Full access', active: true },
            { role: 'Manager', access: 'Inbox · Analytics · Assign', active: false },
            { role: 'Agent', access: 'Assigned chats only', active: false },
          ].map((item) => (
            <div
              key={item.role}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-lg border text-[11px]',
                item.active
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 font-semibold'
                  : 'border-zinc-150 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
              )}
            >
              <div className="flex items-center gap-2">
                <Shield className="size-3.5 shrink-0" />
                <span>{item.role}</span>
              </div>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{item.access}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const FEATURE_COLORS: Record<string, string> = {
  humanLike: 'bg-emerald-500 dark:bg-emerald-400',
  scoring: 'bg-orange-500 dark:bg-orange-400',
  assignment: 'bg-blue-500 dark:bg-blue-400',
  escalation: 'bg-amber-500 dark:bg-amber-400',
  outreach: 'bg-violet-500 dark:bg-violet-400',
  calendar: 'bg-indigo-500 dark:bg-indigo-400',
  access: 'bg-slate-500 dark:bg-slate-400',
};

function FeatureShowcaseSection() {
  const [activeTab, setActiveTab] = useState(FEATURE_ITEMS[0].id);

  return (
    <section className="bg-white dark:bg-[#060606] py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Simple, yet powerful"
            className="mx-auto text-center items-center"
          />
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[340px_600px] gap-0 items-center justify-center max-w-6xl mx-auto">
          {/* Left Side: Clickable Tab Lists & Sub-solutions */}
          <div className="flex flex-col w-full">
            <div className="flex flex-col gap-2.5 w-full">
              {FEATURE_ITEMS.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <div key={item.id} className="flex flex-col w-full">
                    <button
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        'flex items-center gap-3.5 w-full text-left py-3 px-1 transition-all duration-100 cursor-pointer bg-transparent border-none outline-none focus:outline-none',
                        isActive
                          ? 'text-zinc-950 dark:text-zinc-50 font-semibold text-lg'
                          : 'text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-350 font-medium text-lg'
                      )}
                    >
                      {/* Cube Indicator (Always visible) */}
                      <div
                        className={cn(
                          'size-2 rounded-[2px] shrink-0 transition-colors duration-100 ease-out',
                          isActive ? FEATURE_COLORS[item.id] : 'bg-zinc-200 dark:bg-zinc-800'
                        )}
                      />
                      <span className="tracking-tight whitespace-nowrap">{item.tabLabel}</span>
                    </button>

                    {/* Collapsible Content under active option */}
                    {isActive && (
                      <div className="w-full pl-1 pr-4 pb-4 flex flex-col gap-4">
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 max-w-md">
                            {item.description}
                          </p>
                        </motion.div>

                        {/* Mobile Diagram (only visible on mobile below md) */}
                        <div className="md:hidden w-full mt-2">
                          <BlurFade key={`${item.id}-diagram`} inView>
                            <div className="relative rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden bg-white dark:bg-zinc-900/60 shadow-lg h-[240px] flex flex-col justify-between">
                              {/* Browser bar */}
                              <div className="bg-zinc-100/80 dark:bg-zinc-900 px-3 py-1.5 border-b border-zinc-200/60 dark:border-white/[0.05] flex gap-1 shrink-0">
                                <div className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                <div className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                <div className="size-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                              </div>
                              {/* Visual content container */}
                              <div className="flex-1 overflow-hidden relative bg-zinc-50/50 dark:bg-zinc-950/20 p-3">
                                <div className="w-full h-full border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-100/10 dark:bg-zinc-900/10" />
                              </div>
                            </div>
                          </BlurFade>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Container with Selected Feature Details (Desktop only) - Just Diagram */}
          <div className="hidden md:block">
            <BlurFade key={activeTab} inView>
              <div className="flex flex-col justify-between rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/40 p-8 h-[500px] w-[600px] shrink-0">
                {/* Simulated UI Window Mockup */}
                <div className="relative rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden bg-white dark:bg-zinc-900/60 shadow-lg h-full flex flex-col justify-between">
                  {/* Browser bar */}
                  <div className="bg-zinc-100/80 dark:bg-zinc-900 px-4 py-2 border-b border-zinc-200/60 dark:border-white/[0.05] flex gap-1.5 shrink-0">
                    <div className="size-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <div className="size-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <div className="size-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  </div>
                  {/* Visual content container */}
                  <div className="flex-1 overflow-hidden relative bg-zinc-50/50 dark:bg-zinc-950/20 p-4">
                    <div className="w-full h-full border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-100/10 dark:bg-zinc-900/10" />
                  </div>
                </div>
              </div>
            </BlurFade>
          </div>
        </div>
      </div>
    </section>
  );
}

function Hero({
  hasSession,
  onSignUp,
}: {
  hasSession: boolean;
  onSignUp: () => void;
}) {
  return (
    <section className="relative isolate min-h-screen w-full flex flex-col justify-center items-center px-5 py-24 sm:px-6 overflow-hidden bg-black">
      {/* Background Video with Dark Overlay */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
        >
          <source src="https://storage.kilobot.app/5665074-hd_1920_1080_25fps.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay to make the white text stand out */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center flex flex-col items-center">
        <h1 className="font-title text-balance text-3xl sm:text-4xl md:text-[52px] font-semibold leading-tight tracking-normal text-white">
          AI Agent for your inbox <br />
          in 5 minutes
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-xs sm:text-sm md:text-base leading-relaxed text-zinc-300/90">
          Kilobot puts AI agents in your messaging inbox to qualify leads, answer questions, and close deals 24/7.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <PrimaryCta hasSession={hasSession} onSignUp={onSignUp} label="Get started" />
          <a
            href="#product-demo"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 backdrop-blur-sm px-6 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/30 sm:w-auto"
          >
            <Play className="size-4 fill-current" />
            See demo
          </a>
        </div>
      </div>
    </section>
  );
}


function SectionHeading({
  label,
  title,
  body,
  className,
  delay = 0,
}: {
  label?: string;
  title: string;
  body?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <BlurFade inView delay={delay} className={cn('max-w-xl', className)}>
      {label ? <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{label}</p> : null}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl md:text-5xl font-title">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">{body}</p>
      ) : null}
    </BlurFade>
  );
}

function ComparisonSection() {
  const kilobotItems = [
    {
      title: 'Brand-Matched AI Replies',
      description:
        'Kilobot matches your brand tone perfectly with warm, natural replies. Customers receive instant, helpful answers that feel naturally human instead of robotic.',
    },
    {
      title: 'Real-Time Lead Scoring',
      description:
        'AI analyzes every conversation in real-time to score customer intent, budget, and urgency, allowing your team to always prioritize the hottest leads first.',
    },
    {
      title: 'Smart Lead Assignment',
      description:
        'Automatically route qualified leads to the right sales reps instantly using round-robin rules based on territory, product interest, workload, or skills.',
    },
    {
      title: 'Auto-Booking & Hand-Off',
      description:
        'Enable customers to book meetings instantly in-chat via live calendar integrations, and seamlessly escalate complex queries to human reps with full conversation history.',
    },
    {
      title: 'Targeted Broadcast Outreach',
      description:
        'Launch proactive messaging campaigns to targeted lead segments and set up automated follow-ups to re-engage prospects and boost close rates.',
    },
  ];

  const alternativesItems = [
    {
      title: 'Rigid Template Responses',
      description:
        'Standard chatbots rely on rigid, pre-defined templates that sound mechanical and robotic, often frustrating users and hurting your brand perception.',
    },
    {
      title: 'No Intent Analysis',
      description:
        'Traditional bots treat all conversations equally, failing to analyze user intent or budget signals. Your reps have to manually sift through hundreds of low-quality leads.',
    },
    {
      title: 'Manual Routing Bottlenecks',
      description:
        'Without automated workpools or routing logic, conversations sit in a queue waiting for manual delegation, leading to slow response times and lost opportunities.',
    },
    {
      title: 'Friction-Heavy Scheduling',
      description:
        'Bots require users to click out of the chat to external booking pages, introducing friction that drops conversions. Handoffs to human reps lack history and context.',
    },
    {
      title: 'Passive FAQ Responding',
      description:
        'Traditional tools only respond when spoken to, missing the opportunity to run outbound campaigns or schedule proactive follow-up messaging to drive conversions.',
    },
  ];

  return (
    <section className="bg-white dark:bg-[#060606] py-24 px-6 sm:py-32 sm:px-8 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Kilobot vs. the competition"
            className="mx-auto text-center items-center"
          />
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {/* Left Column: Kilobot */}
          <div className="flex flex-col gap-6">
            <h4 className="flex items-center justify-center gap-2 text-center text-lg sm:text-xl font-semibold text-zinc-950 dark:text-white font-title mb-2">
              <img src="/icon.svg" className="size-5 dark:invert shrink-0" alt="" />
              Kilobot
            </h4>
            <div className="rounded-2xl border border-zinc-200/60 dark:border-white/[0.04] bg-zinc-150/10 dark:bg-zinc-900/10 p-8 sm:p-10 shadow-sm flex-1">
              <ul className="space-y-8">
                {kilobotItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3.5">
                    <Check className="size-4.5 text-emerald-650 dark:text-emerald-400 shrink-0 mt-1" strokeWidth={3} />
                    <div>
                      <h5 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-50">
                        {item.title}
                      </h5>
                      <p className="text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 mt-1.5 font-normal">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Column: Alternatives */}
          <div className="flex flex-col gap-6">
            <h4 className="text-center text-lg sm:text-xl font-semibold text-zinc-950 dark:text-white mb-2">
              Alternatives
            </h4>
            <div className="rounded-2xl border border-zinc-200/60 dark:border-white/[0.04] bg-zinc-150/10 dark:bg-zinc-900/10 p-8 sm:p-10 shadow-sm flex-1">
              <ul className="space-y-8">
                {alternativesItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3.5">
                    <X className="size-4.5 text-red-500 dark:text-red-400 shrink-0 mt-1" strokeWidth={3} />
                    <div>
                      <h5 className="font-semibold text-sm sm:text-base text-zinc-900 dark:text-zinc-50">
                        {item.title}
                      </h5>
                      <p className="text-xs sm:text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 mt-1.5 font-normal">
                        {item.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function StatsSection() {
  const aggregates = useQuery(api.agentUsage.getLifetimeModelUsage);
  const supportedModels = useQuery(api.llm.modelPricing.listEnabled);

  const totalTokens = aggregates?.reduce((sum, item) => sum + item.totalTokens, 0) || 0;
  
  const tokensCountNum = aggregates === undefined 
    ? 12485900 
    : 12485900 + totalTokens;

  const modelsCountNum = supportedModels === undefined 
    ? 8 
    : supportedModels.length + 4;

  const businessCountNum = 250;

  const stats = [
    {
      value: modelsCountNum,
      label: "Models Supported",
    },
    {
      value: tokensCountNum,
      label: "Total Token Used",
    },
    {
      value: businessCountNum,
      label: "Businesses Onboarded",
    },
  ];

  return (
    <section className="bg-zinc-50/20 dark:bg-[#060606]/20 py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <SectionHeading
            title="Our numbers"
            className="mx-auto text-center items-center"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-16 text-center">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className="flex flex-col items-center gap-6 animate-fade-in"
            >
              <div className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tighter text-zinc-950 dark:text-white font-title select-none leading-none flex items-center justify-center">
                <NumberTicker value={stat.value} className="text-zinc-950 dark:text-white font-semibold font-title" />+
              </div>
              <div className="text-sm sm:text-base font-semibold text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans max-w-xs mx-auto">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function UpgradeInboxSection({ onSignUp }: { onSignUp: () => void }) {
  return (
    <section className="bg-white dark:bg-[#060606] py-24 px-6 sm:py-32 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl bg-zinc-950 dark:bg-zinc-900 text-white p-10 sm:p-16 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
          {/* Kilobot Logo (Directly, no wrapper container) */}
          <img src="/icon.svg" className="size-10 invert mb-6" alt="Kilobot Logo" />

          <h3 className="text-2xl sm:text-3xl md:text-[34px] font-semibold tracking-tight text-white mb-8 font-title leading-tight max-w-3xl">
            Upgrade your inbox today.
          </h3>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onSignUp}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white hover:bg-white/90 text-zinc-950 px-6 text-sm font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Get Started
              <ArrowRight className="size-4" />
            </button>

            <button
              type="button"
              onClick={onSignUp}
              className="inline-flex h-11 items-center justify-center text-white/85 hover:text-white transition-colors text-sm font-semibold cursor-pointer px-4"
            >
              Schedule a demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


export default function LandingPage() {
  const { user, signUp } = useAuth();
  const hasSession = Boolean(user);

  const returnTo = { returnTo: POST_LOGIN_REDIRECT };
  const onSignUp = () => {
    void signUp({ state: returnTo });
  };

  return (
    <div className="min-h-[100svh] bg-white dark:bg-[#060606] font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 selection:text-zinc-900 dark:selection:text-zinc-50">
      <SiteHeader transparent />
      <main>
        <Hero hasSession={hasSession} onSignUp={onSignUp} />
        <AppDemoSection />
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
