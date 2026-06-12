import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
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
  Zap,
} from 'lucide-react';
import { SiInstagram, SiWhatsapp } from 'react-icons/si';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { BlurFade } from '@/components/ui/blur-fade';
import { Highlighter } from '@/components/ui/highlighter';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const landingCardClass =
  'gap-0 rounded-xl border-zinc-200 bg-white py-0 shadow-none ring-0 dark:border-white/[0.08] dark:bg-white/[0.02]';



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
                <div className="hidden sm:flex h-full w-[220px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card lg:w-[240px]">
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
        <div className="absolute inset-0 bg-white dark:bg-[#060606]" />
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
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-sm sm:text-base md:text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
          Kilobot puts AI agents in your messaging inbox to qualify leads, answer questions, and close deals 24/7.
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


function getCleanModelName(model: string, supportedModels?: any[]): string {
  if (supportedModels) {
    const found = supportedModels.find(m => m.value === model);
    if (found) return found.label;
  }
  const baseName = model.split('/').pop() || model;
  return baseName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
}
function formatTokens(num: number, decimals = true): string {
  if (num >= 1e12) {
    const val = num / 1e12;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'T';
  }
  if (num >= 1e9) {
    const val = num / 1e9;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'B';
  }
  if (num >= 1e6) {
    const val = num / 1e6;
    return (decimals ? val.toFixed(2) : val.toFixed(0)) + 'M';
  }
  if (num >= 1e3) {
    const val = num / 1e3;
    return (decimals && val % 1 !== 0 ? val.toFixed(1) : val.toFixed(0)) + 'K';
  }
  return num.toLocaleString();
}

function ModelEcosystem() {
  const aggregates = useQuery(api.agentUsage.getLifetimeModelUsage);
  const supportedModels = useQuery(api.llm.modelPricing.listEnabled);

  return (
    <section className="scroll-mt-16 border-t border-zinc-200 px-5 py-24 dark:border-white/[0.06] sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-16 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col items-start gap-6">
          <SectionHeading
            label="Models"
            title="Choose Your AI Model"
            body="Select any models that you want."
          />
          <Link 
            to="/leaderboard" 
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white dark:text-zinc-950 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 px-4.5 py-2.5 rounded-lg transition-colors group cursor-pointer"
          >
            View Leaderboard
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <BlurFade inView delay={0.05} className="w-full">
          <Card className={cn(landingCardClass, "overflow-hidden flex flex-col w-full")}>
            {/* Text & Entry Action Content */}
            <CardContent className="p-6 flex flex-col">


              {/* Clean minimalist table */}
              <div className="w-full">
                <div className="grid grid-cols-[48px_1fr_96px] text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 pb-2 border-b border-zinc-200 dark:border-white/[0.06] mb-1">
                  <div>Rank</div>
                  <div>Model</div>
                  <div className="text-right">Tokens</div>
                </div>

                {aggregates === undefined || supportedModels === undefined ? (
                  // Loading skeleton rows
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-[48px_1fr_96px] py-3.5 border-b border-zinc-100/50 dark:border-white/[0.03] items-center">
                      <Skeleton className="h-4 w-4 rounded bg-zinc-200 dark:bg-white/[0.08]" />
                      <Skeleton className="h-4 w-28 rounded bg-zinc-200 dark:bg-white/[0.08]" />
                      <Skeleton className="h-4 w-16 rounded ml-auto bg-zinc-200 dark:bg-white/[0.08]" />
                    </div>
                  ))
                ) : aggregates.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-6 text-center">No usage recorded yet.</div>
                ) : (
                  // Real data rows (top 5)
                  aggregates.slice(0, 5).map((item, index) => {
                    const cleanName = getCleanModelName(item.model, supportedModels);
                    return (
                      <div 
                        key={item.model} 
                        className="grid grid-cols-[48px_1fr_96px] py-3.5 border-b border-zinc-100 dark:border-white/[0.04] last:border-0 items-center text-sm"
                      >
                        <span className="font-mono text-zinc-400 dark:text-zinc-500 font-medium">
                          #{index + 1}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-white truncate">
                          {cleanName}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400 font-light text-right tabular-nums">
                          {formatTokens(item.totalTokens)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </section>
  );
}


function FinalCta({ hasSession, onSignUp }: { hasSession: boolean; onSignUp: () => void }) {
  if (hasSession) return null;

  return (
    <section className="bg-white dark:bg-[#060606] border-t border-zinc-200 dark:border-white/[0.06] w-full px-6 py-16 sm:px-12 sm:py-20">
      <div className="mx-auto max-w-6xl flex justify-center">
        <div className="shrink-0">
          <button
            onClick={onSignUp}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 px-6 text-sm font-semibold transition-colors cursor-pointer"
          >
            Request a Demo
          </button>
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
      <SiteHeader />
      <main>
        <Hero hasSession={hasSession} onSignUp={onSignUp} />
        <ModelEcosystem />
        <FinalCta hasSession={hasSession} onSignUp={onSignUp} />
      </main>
      <SiteFooter />
    </div>
  );
}
