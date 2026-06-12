import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleDot,
  Contact,
  MessageSquare,
  PanelLeftClose,
  Play,
  Plug,
  Search,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { SiInstagram, SiWhatsapp } from 'react-icons/si';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { ModeToggle } from '@/components/mode-toggle';
import { SiteFooter } from '@/components/SiteFooter';
import { BlurFade } from '@/components/ui/blur-fade';
import { Highlighter } from '@/components/ui/highlighter';
import { NumberTicker } from '@/components/ui/number-ticker';
import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from '@/components/ui/terminal';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const landingCardClass =
  'gap-0 rounded-xl border-zinc-200 bg-white py-0 shadow-none ring-0 dark:border-white/[0.08] dark:bg-white/[0.02]';

const teams = ['Aster Labs', 'Nvidia Growth', 'OpenAI Ops', 'Stripe GTM', 'Linear Sales', 'Vercel CX'];

const features = [
  {
    icon: MessageSquare,
    title: 'Qualify in thread',
    body: 'Spot intent, urgency, and deal size.',
  },
  {
    icon: BrainCircuit,
    title: 'Answer from context',
    body: 'Catalog, policy, and CRM in every reply.',
  },
  {
    icon: Workflow,
    title: 'Route work',
    body: 'Escalate with a summary when needed.',
  },
  {
    icon: Zap,
    title: 'Move faster',
    body: 'Drafts before the buyer goes cold.',
  },
] as const;

const models = ['GPT-5', 'Claude', 'Gemini', 'Grok'];

const testimonials = [
  {
    quote: 'Like ten senior reps who know when to hand off.',
    name: 'Maya Tan',
    title: 'Head of Growth, Luma Commerce',
  },
  {
    quote: 'WhatsApp became our highest-intent channel.',
    name: 'Jon Bell',
    title: 'Founder, Northstar Supply',
  },
  {
    quote: 'Full context without digging through tabs.',
    name: 'Priya Rao',
    title: 'RevOps Lead, Orbit Markets',
  },
];

function Nav({
  hasSession,
  onSignIn,
  onSignUp,
}: {
  hasSession: boolean;
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 dark:border-white/[0.06] bg-white/75 dark:bg-[#060606]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-zinc-900 dark:text-white">
          <img src="/icon.svg" className="size-6 dark:invert" />
          Kilobot
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-zinc-600 dark:text-zinc-400 md:flex">
          <Link to="/" className="transition-colors text-zinc-900 dark:text-white font-medium">
            Home
          </Link>
          <Link to="/pricing" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
            Pricing
          </Link>
          <Link to="/leaderboard" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
            Leaderboard
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ModeToggle />
          {hasSession ? (
            <Link
              to={POST_LOGIN_REDIRECT}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white px-3.5 py-2 text-sm font-medium dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90"
            >
              Dashboard
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={onSignUp}
                className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white px-3.5 py-2 text-sm font-medium dark:text-[#050505] dark:shadow-[0_0_24px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90"
              >
                Get started
                <ArrowRight className="size-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

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
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white px-6 text-sm font-medium dark:text-[#050505] dark:shadow-[0_0_32px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90 sm:w-auto"
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
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white px-6 text-sm font-medium dark:text-[#050505] dark:shadow-[0_0_32px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90 sm:w-auto"
    >
      {label}
      <ArrowRight className="size-4" />
    </button>
  );
}

const mockConversations = [
  {
    name: 'Lena Chen',
    preview: 'Yes — send the invoice.',
    time: '2m ago',
    unread: 0,
    platform: 'whatsapp' as const,
    selected: true,
  },
  {
    name: 'Marco Imports',
    preview: 'Can you send the full catalog?',
    time: '14m ago',
    unread: 2,
    platform: 'whatsapp' as const,
    selected: false,
  },
  {
    name: 'Soho Retail',
    preview: 'Thanks, placing the order now.',
    time: '1h ago',
    unread: 0,
    platform: 'instagram' as const,
    selected: false,
  },
];

function MockPlatformIcon({
  platform,
  size = 14,
}: {
  platform: 'whatsapp' | 'instagram';
  size?: number;
}) {
  if (platform === 'whatsapp') {
    return <SiWhatsapp size={size} className="shrink-0 text-[#25D366]" />;
  }
  return <SiInstagram size={size} className="shrink-0 text-[#E4405F]" />;
}

function MockSidebarNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px]',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70',
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function ProductMockup() {
  return (
    <div className="relative mx-auto mt-16 max-w-6xl px-2 sm:px-0">
      <Card
        className={cn(
          landingCardClass,
          'overflow-hidden rounded-xl shadow-lg shadow-zinc-900/5 ring-1 ring-zinc-900/5 dark:shadow-black/20 dark:ring-white/[0.06]',
        )}
      >
        <div className="flex min-h-[540px] bg-background">
          {/* App sidebar */}
          <aside className="hidden w-[200px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
            <div className="flex items-center justify-between px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <img src="/icon.svg" alt="" className="size-5 dark:invert" />
                <div className="min-w-0 leading-none">
                  <p className="truncate text-[13px] font-semibold tracking-tight">Kilobot</p>
                  <p className="truncate text-[11px] text-sidebar-foreground/60">Sales Agent</p>
                </div>
              </div>
              <PanelLeftClose className="size-4 shrink-0 text-sidebar-foreground/50" />
            </div>

            <div className="flex flex-1 flex-col gap-4 px-2 pb-3">
              <div>
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/50">
                  Engagement
                </p>
                <div className="space-y-0.5">
                  <MockSidebarNavItem icon={MessageSquare} label="Inbox" active />
                  <MockSidebarNavItem icon={Users} label="Customers" />
                </div>
              </div>
              <div>
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/50">
                  AI Agent
                </p>
                <div className="space-y-0.5">
                  <MockSidebarNavItem icon={Bot} label="Playground" />
                  <MockSidebarNavItem icon={BookOpen} label="Knowledge Base" />
                  <MockSidebarNavItem icon={Plug} label="Channels" />
                  <MockSidebarNavItem icon={Zap} label="Automations" />
                </div>
              </div>
              <div>
                <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/50">
                  Insights
                </p>
                <MockSidebarNavItem icon={BarChart3} label="Analytics" />
              </div>
            </div>

            <div className="border-t border-sidebar-border px-3 py-2.5">
              <div className="rounded-lg border border-border/60 bg-sidebar-accent/40 px-2.5 py-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">Credits</span>
                  <span className="text-muted-foreground">2,400 left</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[68%] rounded-full bg-foreground/80" />
                </div>
              </div>
            </div>
          </aside>

          {/* Main dashboard area */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border/50 px-4 text-[13px]">
              <span className="text-muted-foreground">Workspace</span>
              <span className="text-muted-foreground/60">/</span>
              <span className="font-medium text-foreground">Sales Agent</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </header>

            <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
              <div>
                <h2 className="m-0 text-lg font-bold tracking-tight text-foreground">Messages</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Conversations from your connected channels
                </p>
              </div>

              <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
                {/* Inbox list */}
                <div className="flex h-full w-[220px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:w-[240px]">
                  <div className="border-b border-border p-3">
                    <div className="relative mb-2.5">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <div className="h-9 rounded-lg border border-border bg-background pl-8 pr-3 text-xs leading-9 text-muted-foreground">
                        Search conversations…
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground">
                        Platform
                        <ChevronDown className="size-3.5 opacity-50" />
                      </div>
                      <div className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-xs text-foreground">
                        <CircleDot className="size-3.5 text-emerald-600" />
                        Open
                        <ChevronDown className="size-3.5 opacity-50" />
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden">
                    {mockConversations.map((chat, index) => (
                      <div
                        key={chat.name}
                        className={cn(
                          'flex cursor-default items-center gap-3 px-3 py-2.5',
                          chat.selected ? 'bg-muted/50' : 'bg-transparent',
                          index !== mockConversations.length - 1 && 'border-b border-border',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 truncate text-[13px] font-semibold text-foreground">
                              <MockPlatformIcon platform={chat.platform} />
                              {chat.name}
                            </span>
                            <span className="shrink-0 text-[11px] text-muted-foreground">{chat.time}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="m-0 truncate text-xs text-muted-foreground">{chat.preview}</p>
                            {chat.unread > 0 ? (
                              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                {chat.unread}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thread */}
                <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                    <h3 className="m-0 truncate text-base font-semibold text-foreground">Lena Chen</h3>
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
                    <div className="flex w-full justify-center pb-3">
                      <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        Today
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex w-fit max-w-[85%] flex-col items-start gap-1">
                        <div className="rounded-[2px_16px_16px_16px] border border-border bg-card px-3 py-1.5 text-sm leading-snug text-foreground">
                          Restocking our Dubai pop-up. What&apos;s the best bundle for 500 units?
                        </div>
                        <span className="pl-0.5 text-[11px] text-muted-foreground">10:42 AM</span>
                      </div>

                      <div className="ml-auto flex w-fit max-w-[85%] flex-col items-end gap-1">
                        <span className="flex items-center gap-1 pr-0.5 text-[11px] text-muted-foreground">
                          Sales Agent
                          <span className="rounded bg-muted px-1 py-px text-[10px] font-medium uppercase tracking-wide">
                            AI
                          </span>
                        </span>
                        <div className="rounded-[16px_16px_2px_16px] bg-blue-50 px-3 py-1.5 text-sm leading-snug text-blue-950 dark:bg-blue-950/40 dark:text-blue-200">
                          Launch Bundle: 300 Core + 200 Travel. Ships tomorrow with margin above 42%. Want me to
                          reserve inventory?
                        </div>
                        <span className="flex items-center gap-0.5 pr-0.5 text-[11px] text-muted-foreground">
                          <Check className="size-2.5 opacity-80" />
                          10:43 AM
                        </span>
                      </div>

                      <div className="flex w-fit max-w-[85%] flex-col items-start gap-1">
                        <div className="rounded-[2px_16px_16px_16px] border border-border bg-card px-3 py-1.5 text-sm leading-snug text-foreground">
                          Yes — send the invoice.
                        </div>
                        <span className="pl-0.5 text-[11px] text-muted-foreground">10:44 AM</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-border p-3">
                    <div className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2">
                      <p className="m-0 flex-1 text-sm text-muted-foreground">Reply to Lena Chen…</p>
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                        <ArrowRight className="size-3.5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details panel */}
                <div className="hidden h-full w-[200px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:flex xl:w-[220px]">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="m-0 text-sm font-bold text-foreground">Details</h3>
                  </div>

                  <div className="flex-1 overflow-hidden px-4 py-3">
                    <div className="mb-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Users className="size-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground">Assignee</span>
                      </div>
                      <div className="flex h-9 items-center justify-between rounded-md border border-border bg-background px-2.5 text-xs">
                        <span className="flex items-center gap-2 truncate text-foreground">
                          <Bot className="size-3.5 shrink-0 text-muted-foreground" />
                          AI Agent
                        </span>
                        <ChevronDown className="size-3.5 shrink-0 opacity-60" />
                      </div>
                    </div>

                    <div className="my-3 h-px bg-border" />

                    <button
                      type="button"
                      className="flex w-full items-center gap-2 py-1 text-left"
                      tabIndex={-1}
                    >
                      <Contact className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 text-xs font-semibold text-foreground">Customer details</span>
                      <ChevronDown className="size-3.5 -rotate-90 text-muted-foreground" />
                    </button>

                    <div className="mt-2 space-y-2.5 pl-5">
                      <div>
                        <p className="m-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Name
                        </p>
                        <p className="m-0 mt-0.5 text-xs text-foreground">Lena Chen</p>
                      </div>
                      <div>
                        <p className="m-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Platform
                        </p>
                        <p className="m-0 mt-0.5 flex items-center gap-1.5 text-xs text-foreground">
                          <SiWhatsapp size={12} className="text-[#25D366]" />
                          WhatsApp
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Phone
                        </p>
                        <p className="m-0 mt-0.5 text-xs text-foreground">+971 50 123 4567</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </Card>
    </div>
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
    <section className="relative isolate overflow-hidden px-5 pb-24 pt-32 sm:px-6 sm:pb-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-zinc-50 dark:bg-[#060606]" />
      </div>
      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-zinc-950 dark:text-white sm:text-6xl md:text-7xl lg:text-7xl">
          AI Agent for your inbox <br />
          in{' '}
          <Highlighter
            action="highlight"
            color="#FACC15"
            isView
            padding={[2, 2, 2, 0] as const}
            className="ml-[0.2em]"
          >
            5 minutes
          </Highlighter>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
          Kilobot keeps your inbox moving 24/7. It qualifies leads, answers questions, and pushes deals
          forward—all while you sleep.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <PrimaryCta hasSession={hasSession} onSignUp={onSignUp} label="Get started" />
          <a
            href="#product-demo"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white/80 px-6 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-zinc-200 dark:hover:border-white/[0.2] dark:hover:bg-white/[0.06] sm:w-auto"
          >
            <Play className="size-4 fill-current" />
            See demo
          </a>
        </div>
      </div>
      <div id="product-demo" className="relative z-10 scroll-mt-24">
        <ProductMockup />
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-zinc-200 dark:border-white/[0.06] px-5 py-12 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Trusted by sales teams</p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-medium text-zinc-400 dark:text-zinc-500">
          {teams.map((team) => (
            <span key={team}>{team}</span>
          ))}
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
  label: string;
  title: string;
  body?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <BlurFade inView delay={delay} className={cn('max-w-xl', className)}>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-pretty text-base leading-7 text-zinc-600 dark:text-zinc-400">{body}</p>
      ) : null}
    </BlurFade>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  delay?: number;
}) {
  return (
    <BlurFade inView delay={delay}>
      <Card size="sm" className={landingCardClass}>
        <CardContent className="flex gap-3 py-4">
          <Icon className="mt-0.5 size-5 shrink-0 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
          <div className="min-w-0">
            <CardTitle className="text-zinc-900 dark:text-white">{title}</CardTitle>
            <CardDescription className="mt-1 text-zinc-600 dark:text-zinc-400">{body}</CardDescription>
          </div>
        </CardContent>
      </Card>
    </BlurFade>
  );
}

function AgenticShowcase() {
  return (
    <section className="scroll-mt-16 px-5 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-start">
        <SectionHeading
          label="Product"
          title="Every message drives sales."
          body="Context in. Reply out. Handoff when it matters."
        />
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} delay={index * 0.05} />
            ))}
          </div>
          <BlurFade inView delay={0.2}>
            <Card size="sm" className={landingCardClass}>
              <CardContent className="flex flex-wrap gap-x-6 gap-y-1 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                <span>Slack handoffs</span>
                <span>CRM events</span>
                <span>Webhooks</span>
              </CardContent>
            </Card>
          </BlurFade>
        </div>
      </div>
    </section>
  );
}

function StatsStrip() {
  const stats = [
    { label: 'Reply time', value: 18, suffix: 's' },
    { label: 'Qualified', value: 76, suffix: '%' },
    { label: 'Pipeline', value: 84, suffix: 'k', prefix: '$' },
  ] as const;

  return (
    <section className="border-y border-zinc-200 dark:border-white/[0.06] px-5 py-16 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <BlurFade key={stat.label} inView delay={index * 0.05}>
            <Card size="sm" className={landingCardClass}>
              <CardContent className="py-5 text-center sm:text-left">
                <p className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                  {'prefix' in stat ? stat.prefix : ''}
                  <NumberTicker value={stat.value} />
                  {stat.suffix}
                </p>
                <CardDescription className="mt-2">{stat.label}</CardDescription>
              </CardContent>
            </Card>
          </BlurFade>
        ))}
      </div>
    </section>
  );
}

function ReplyDemo() {
  return (
    <section className="px-5 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        <SectionHeading
          label="Drafts"
          title="Replies ready before send."
          body="Suggested answers you can edit and send."
        />
        <BlurFade inView delay={0.1}>
          <Card className={cn(landingCardClass, 'overflow-hidden p-0')}>
            <Terminal className="rounded-none border-0 bg-transparent shadow-none">
              <TypingAnimation>&gt; compose</TypingAnimation>
              <AnimatedSpan className="text-zinc-500">// draft</AnimatedSpan>
              <AnimatedSpan className="text-zinc-900 dark:text-zinc-100">
                Launch Bundle reserved. Ships tomorrow.
              </AnimatedSpan>
              <AnimatedSpan className="text-zinc-500">+ upsell · payment link</AnimatedSpan>
              <TypingAnimation className="text-zinc-400">Ready.</TypingAnimation>
            </Terminal>
          </Card>
        </BlurFade>
      </div>
    </section>
  );
}

function ModelEcosystem() {
  return (
    <section className="scroll-mt-16 border-t border-zinc-200 px-5 py-24 dark:border-white/[0.06] sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-start">
        <SectionHeading
          label="Models"
          title="Right model, every task."
          body="Fast for triage. Deep for complex quotes."
        />
        <div className="space-y-4">
          <BlurFade inView delay={0.05}>
            <Card size="sm" className={landingCardClass}>
              <CardHeader className="px-4 pb-0 pt-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-normal text-zinc-500 dark:text-zinc-400">Supported</CardTitle>
                <Link to="/leaderboard" className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1">
                  View Live Leaderboard <ArrowRight className="size-3" />
                </Link>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pb-4">
                {models.map((model, index) => (
                  <span
                    key={model}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-sm font-medium',
                      index === 0
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-950'
                        : 'border-zinc-200 text-zinc-600 dark:border-white/[0.1] dark:text-zinc-400',
                    )}
                  >
                    {model}
                  </span>
                ))}
              </CardContent>
            </Card>
          </BlurFade>
          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureCard
              icon={BrainCircuit}
              title="Guardrails"
              body="Discounts and claims stay on-policy."
              delay={0.1}
            />
            <FeatureCard
              icon={Workflow}
              title="Cloud agents"
              body="Follow-ups run while you're offline."
              delay={0.15}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContextTimeline() {
  const items = [
    ['Inbox', 'WhatsApp, Instagram, Messenger — one place.'],
    ['Knowledge', 'Catalog, policy, and chat history.'],
    ['Handoffs', 'Your team gets full context.'],
    ['Pipeline', 'Qualification tracked automatically.'],
  ] as const;

  return (
    <section className="px-5 py-24 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-start">
        <SectionHeading
          label="Context"
          title="Everything stays indexed."
          body="What they asked last week still matters."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(([title, body], index) => (
            <BlurFade key={title} inView delay={index * 0.05}>
              <Card size="sm" className={cn(landingCardClass, 'h-full')}>
                <CardHeader className="px-4 pb-0 pt-4">
                  <CardTitle className="text-zinc-900 dark:text-white">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <CardDescription>{body}</CardDescription>
                </CardContent>
              </Card>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="border-t border-zinc-200 px-5 py-24 dark:border-white/[0.06] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <BlurFade inView className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">Customers</p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl md:text-5xl">
            Built for inbox teams.
          </h2>
        </BlurFade>
        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <BlurFade key={testimonial.name} inView delay={index * 0.08}>
              <Card size="sm" className={cn(landingCardClass, 'h-full')}>
                <CardContent className="flex h-full flex-col justify-between py-5">
                  <blockquote className="text-base leading-7 text-zinc-700 dark:text-zinc-300">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <footer className="mt-6 border-t border-zinc-100 pt-4 dark:border-white/[0.06]">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{testimonial.name}</p>
                    <CardDescription className="mt-0.5">{testimonial.title}</CardDescription>
                  </footer>
                </CardContent>
              </Card>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ hasSession, onSignUp }: { hasSession: boolean; onSignUp: () => void }) {
  return (
    <section className="px-5 pb-32 pt-8 sm:px-6">
      <BlurFade inView className="mx-auto max-w-2xl">
        <Card className={landingCardClass}>
          <CardContent className="py-10 text-center sm:py-12">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
              Scale your best rep.
            </h2>
            <CardDescription className="mx-auto mt-4 max-w-md text-base leading-7">
              Launch an agent and start closing from your inbox.
            </CardDescription>
            <div className="mt-8 flex justify-center">
              <PrimaryCta hasSession={hasSession} onSignUp={onSignUp} label="Get started" />
            </div>
          </CardContent>
        </Card>
      </BlurFade>
    </section>
  );
}

export default function LandingPage() {
  const { user, signIn, signUp } = useAuth();
  const hasSession = Boolean(user);

  const returnTo = { returnTo: POST_LOGIN_REDIRECT };
  const onSignIn = () => {
    void signIn({ state: returnTo });
  };
  const onSignUp = () => {
    void signUp({ state: returnTo });
  };

  return (
    <div className="min-h-[100svh] bg-zinc-50 dark:bg-[#060606] font-sans text-zinc-900 dark:text-zinc-100 antialiased selection:bg-black/10 dark:selection:bg-white/20 selection:text-zinc-950 dark:selection:text-white">
      <Nav hasSession={hasSession} onSignIn={onSignIn} onSignUp={onSignUp} />
      <main>
        <Hero hasSession={hasSession} onSignUp={onSignUp} />
        <SocialProof />
        <AgenticShowcase />
        <StatsStrip />
        <ReplyDemo />
        <ModelEcosystem />
        <ContextTimeline />
        <Testimonials />
        <FinalCta hasSession={hasSession} onSignUp={onSignUp} />
      </main>
      <SiteFooter />
    </div>
  );
}
