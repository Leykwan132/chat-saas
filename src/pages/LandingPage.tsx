import { Link } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  Cloud,
  Code2,
  GitBranch,
  MessageSquare,
  MousePointer2,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from 'lucide-react';
import { POST_LOGIN_REDIRECT } from '@/constants';

const teams = ['Aster Labs', 'Nvidia Growth', 'OpenAI Ops', 'Stripe GTM', 'Linear Sales', 'Vercel CX'];

const testimonials = [
  {
    quote: 'Kilobot feels like adding ten senior reps who already know the catalog, the objections, and the right moment to bring in a human.',
    name: 'Maya Tan',
    title: 'Head of Growth, Luma Commerce',
  },
  {
    quote: 'Our team stopped treating WhatsApp like a support queue. It became our highest intent sales channel.',
    name: 'Jon Bell',
    title: 'Founder, Northstar Supply',
  },
  {
    quote: 'The magic is context. Kilobot remembers the customer, the product, and the buying stage without forcing reps to dig.',
    name: 'Priya Rao',
    title: 'RevOps Lead, Orbit Markets',
  },
];

const models = ['GPT-5', 'Claude', 'Gemini', 'Grok'];

const footerGroups = [
  { title: 'Product', links: ['Inbox', 'Agents', 'Knowledge Base', 'Analytics'] },
  { title: 'Resources', links: ['Docs', 'Playbooks', 'Templates', 'Changelog'] },
  { title: 'Company', links: ['Customers', 'Careers', 'Security', 'Contact'] },
  { title: 'Legal', links: ['Privacy', 'Terms', 'SOC 2', 'DPA'] },
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
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#060606]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-white">
          <span className="flex size-8 items-center justify-center rounded-lg bg-white text-[#050505] shadow-[0_0_28px_rgba(255,255,255,0.18)]">
            <Sparkles className="size-4" strokeWidth={2.25} />
          </span>
          Kilobot
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
          <a href="#product" className="inline-flex items-center gap-1 transition-colors hover:text-white">
            Product <ChevronDown className="size-3" />
          </a>
          <a href="#resources" className="inline-flex items-center gap-1 transition-colors hover:text-white">
            Resources <ChevronDown className="size-3" />
          </a>
          <a href="#enterprise" className="transition-colors hover:text-white">
            Enterprise
          </a>
          <a href="#pricing" className="transition-colors hover:text-white">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {hasSession ? (
            <Link
              to={POST_LOGIN_REDIRECT}
              className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-sm font-medium text-[#050505] shadow-[0_0_24px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90"
            >
              Dashboard
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={onSignIn}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:text-white"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={onSignUp}
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-sm font-medium text-[#050505] shadow-[0_0_24px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90"
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
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-[#050505] shadow-[0_0_32px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90 sm:w-auto"
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
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-6 text-sm font-medium text-[#050505] shadow-[0_0_32px_rgba(255,255,255,0.16)] transition-opacity hover:opacity-90 sm:w-auto"
    >
      {label}
      <ArrowRight className="size-4" />
    </button>
  );
}

function ProductMockup() {
  const conversations = [
    { name: 'Lena from Aster', status: 'Ready to buy', value: '$8.2k' },
    { name: 'Marco Imports', status: 'Asked for catalog', value: '$3.4k' },
    { name: 'Soho Retail', status: 'Needs handoff', value: '$12.7k' },
  ];

  return (
    <div className="relative mx-auto mt-16 max-w-6xl">
      <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(102,92,255,0.32),transparent_42%),radial-gradient(circle_at_78%_20%,rgba(56,189,248,0.18),transparent_30%)] blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0d0d0f]/90 shadow-2xl shadow-black/60 backdrop-blur">
        <div className="flex h-10 items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="hidden rounded-full border border-white/[0.08] bg-black/30 px-3 py-1 text-xs text-zinc-500 sm:block">
            kilobot://inbox/sales-agent
          </div>
          <div className="text-xs text-zinc-500">Live</div>
        </div>
        <div className="grid min-h-[520px] lg:grid-cols-[250px_1fr_320px]">
          <aside className="border-b border-white/[0.08] bg-white/[0.02] p-4 lg:border-b-0 lg:border-r">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Inbox</p>
              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-300">
                42 active
              </span>
            </div>
            <div className="space-y-2">
              {conversations.map((conversation, index) => (
                <div
                  key={conversation.name}
                  className={`rounded-xl border p-3 ${
                    index === 0
                      ? 'border-white/[0.14] bg-white/[0.08]'
                      : 'border-white/[0.06] bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-zinc-100">{conversation.name}</p>
                    <span className="text-xs text-zinc-500">{conversation.value}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{conversation.status}</p>
                </div>
              ))}
            </div>
          </aside>
          <section className="border-b border-white/[0.08] p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Lena from Aster Labs</p>
                <p className="text-xs text-zinc-500">WhatsApp sales thread - qualified in 38 seconds</p>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-200">
                Agent drafting
              </span>
            </div>
            <div className="space-y-4">
              <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.04] p-4 text-sm leading-relaxed text-zinc-300">
                We are restocking our Dubai pop-up next week. Can you recommend the fastest bundle for 500 units?
              </div>
              <div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-sm border border-violet-300/20 bg-violet-300/10 p-4 text-sm leading-relaxed text-violet-50">
                Yes. Based on your last purchase and current inventory, the fastest option is the Launch Bundle:
                300 Core Kits + 200 Travel Kits. It ships tomorrow and keeps your margin above 42%.
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
                  <Bot className="size-4 text-cyan-300" />
                  Kilobot plan
                </div>
                <div className="space-y-2 text-sm text-zinc-300">
                  {['Confirm shipping deadline', 'Offer Launch Bundle', 'Escalate if discount exceeds 8%'].map(
                    (item) => (
                      <div key={item} className="flex items-center gap-2">
                        <Check className="size-4 text-emerald-300" />
                        {item}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </section>
          <aside className="bg-[radial-gradient(circle_at_20%_0%,rgba(56,189,248,0.12),transparent_32%),rgba(255,255,255,0.02)] p-4 sm:p-6">
            <p className="text-sm font-medium text-white">Revenue cockpit</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ['Reply time', '18s'],
                ['Qualified', '76%'],
                ['Pipeline', '$84k'],
                ['Handoffs', '9'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
                  <p className="text-[11px] text-zinc-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/25 p-4">
              <p className="text-xs text-zinc-500">Knowledge used</p>
              <div className="mt-3 space-y-2">
                {['Catalog margins', 'Shipping rules', 'VIP discount policy'].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Search className="size-3.5 text-zinc-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
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
    <section className="relative overflow-hidden px-5 pb-24 pt-32 sm:px-6 sm:pb-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[#060606]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.25),transparent_42%),radial-gradient(circle_at_76%_16%,rgba(14,165,233,0.14),transparent_30%)]" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.32]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage: 'linear-gradient(to bottom, black 10%, transparent 78%)',
        }}
      />
      <div className="mx-auto max-w-5xl text-center">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium tracking-wide text-zinc-400 shadow-[0_0_32px_rgba(255,255,255,0.06)] backdrop-blur">
          <Sparkles className="size-3.5 text-zinc-200" />
          AI sales agents for every inbox
        </p>
        <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl lg:text-[5.25rem]">
          <span className="bg-gradient-to-b from-white via-zinc-100 to-zinc-500 bg-clip-text text-transparent">
            1000x your inbox sales with Kilobot.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-8 text-zinc-400 sm:text-lg">
          AI inbox agents that qualify buyers, answer from context, and route hot deals to your team.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <PrimaryCta hasSession={hasSession} onSignUp={onSignUp} label="Start selling faster" />
          <a
            href="#product"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.03] px-6 text-sm font-medium text-zinc-200 transition-colors hover:border-white/[0.2] hover:bg-white/[0.06] sm:w-auto"
          >
            Watch the product
            <MousePointer2 className="size-4" />
          </a>
        </div>
      </div>
      <ProductMockup />
    </section>
  );
}

function SocialProof() {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.015] px-5 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-zinc-600">
          Trusted by ambitious inbox sales teams
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3 text-center text-sm font-medium text-zinc-500 sm:grid-cols-3 lg:grid-cols-6">
          {teams.map((team) => (
            <div key={team} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              {team}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-cyan-300/70">{eyebrow}</p>
      <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">{title}</h2>
      <p className="mt-4 text-pretty text-base leading-7 text-zinc-500 sm:text-lg">{body}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]">
      <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-200 transition-colors group-hover:text-cyan-200">
        <Icon className="size-5" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-zinc-500">{body}</p>
    </div>
  );
}

function AgenticShowcase() {
  return (
    <section id="product" className="scroll-mt-16 px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow="Agentic inbox"
            title="Agents turn every message into a sales motion."
            body="Kilobot works like a top rep beside every conversation: it reads context, searches your catalog, composes replies, and asks for human help only when it matters."
          />
          <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c0e] p-4 shadow-2xl shadow-black/40">
            <div className="grid gap-3 md:grid-cols-2">
              <FeatureCard
                icon={MessageSquare}
                title="Qualify in the thread"
                body="Detect purchase intent, objections, order size, urgency, and buyer fit from live inbox conversations."
              />
              <FeatureCard
                icon={BrainCircuit}
                title="Answer from context"
                body="Ground responses in product pages, policies, historical chats, and CRM notes without hallucinated promises."
              />
              <FeatureCard
                icon={Workflow}
                title="Route the right work"
                body="Escalate discounts, enterprise accounts, or sensitive issues to the right teammate with a complete summary."
              />
              <FeatureCard
                icon={Zap}
                title="Move faster than tabs"
                body="Drafts, next best actions, and revenue insights arrive before the customer has time to go cold."
              />
            </div>
          </div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { icon: MessageSquare, text: 'Slack handoffs' },
            { icon: GitBranch, text: 'CRM-ready events' },
            { icon: Terminal, text: 'Webhook automation' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-sm text-zinc-400">
              <Icon className="size-4 text-zinc-300" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AutocompleteBreak() {
  return (
    <section className="px-5 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.24),transparent_28%),radial-gradient(circle_at_78%_30%,rgba(124,58,237,0.28),transparent_34%),linear-gradient(135deg,#101014,#060606)] p-6 shadow-2xl shadow-black/50 sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-white/50">
              Visual break
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Magically accurate replies before your rep hits send.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-300/80">
              Kilobot predicts the next best answer from the entire buying journey, then keeps the rep in
              control with edit-ready drafts and policy checks.
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.12] bg-black/45 p-4 backdrop-blur">
            <div className="mb-4 flex items-center gap-2 text-xs text-zinc-500">
              <Code2 className="size-4" />
              reply-composer.ai
            </div>
            <div className="space-y-3 font-mono text-sm leading-7">
              <p className="text-zinc-500">{'// Suggested response'}</p>
              <p>
                <span className="text-violet-300">const</span>{' '}
                <span className="text-cyan-200">reply</span>{' '}
                <span className="text-zinc-500">=</span>{' '}
                <span className="text-emerald-200">"I can reserve that bundle today."</span>
              </p>
              <p className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-emerald-100">
                Autocomplete: add shipping window, margin-safe upsell, and payment link.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModelEcosystem() {
  return (
    <section id="resources" className="scroll-mt-16 px-5 py-24 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-start">
        <SectionHeading
          eyebrow="Model choice"
          title="Bring the best model to every sales task."
          body="Use fast models for triage, deep reasoning models for complex quotes, and specialized automations for enrichment. Kilobot gives teams one control plane."
        />
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Model selector</p>
              <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-zinc-500">Auto</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {models.map((model, index) => (
                <div
                  key={model}
                  className={`rounded-xl border p-4 ${
                    index === 0
                      ? 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100'
                      : 'border-white/[0.07] bg-white/[0.025] text-zinc-400'
                  }`}
                >
                  <p className="font-medium">{model}</p>
                  <p className="mt-1 text-xs opacity-70">
                    {index === 0 ? 'Best for closing replies' : 'Available for routing'}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FeatureCard
              icon={ShieldCheck}
              title="Policy guardrails"
              body="Keep discounts, refunds, and product claims inside approved business rules."
            />
            <FeatureCard
              icon={Cloud}
              title="Cloud agents"
              body="Run enrichment, follow-ups, and routing jobs even when the team is offline."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContextTimeline() {
  const items = [
    ['2022', 'Inbox capture'],
    ['2023', 'Knowledge retrieval'],
    ['2024', 'Agent handoffs'],
    ['2025', 'Revenue orchestration'],
    ['2026', 'Autonomous sales loops'],
  ];

  return (
    <section className="border-y border-white/[0.06] bg-white/[0.015] px-5 py-24 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionHeading
          eyebrow="Complete context"
          title="Your catalog, policies, and customers stay indexed."
          body="Kilobot understands the messy shape of sales conversations: product pages, shipping terms, quote history, account notes, and what the customer asked three weeks ago."
        />
        <div className="relative rounded-3xl border border-white/[0.08] bg-[#0c0c0e] p-6">
          <div className="absolute bottom-8 left-9 top-8 w-px bg-gradient-to-b from-cyan-300/60 via-white/10 to-transparent" />
          <div className="space-y-7">
            {items.map(([year, label]) => (
              <div key={year} className="relative flex gap-5">
                <span className="relative z-10 mt-1 flex size-3 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,0.6)]" />
                <div>
                  <p className="text-sm font-medium text-white">{year}</p>
                  <p className="mt-1 text-sm text-zinc-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-white/[0.07] bg-black/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
              <GitBranch className="size-4 text-cyan-200" />
              Semantic search result
            </div>
            <p className="text-sm leading-7 text-zinc-500">
              "Dubai pop-up accounts prefer launch bundles, require next-day fulfillment, and accept
              discounts up to 8% when order value exceeds $7,500."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="px-5 py-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-violet-300/70">
            Loved by operators
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Built for the teams that live inside the inbox.
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
              <p className="text-base leading-8 text-zinc-300">"{testimonial.quote}"</p>
              <div className="mt-8 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-600 text-sm font-semibold text-black">
                  {testimonial.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{testimonial.name}</p>
                  <p className="text-xs text-zinc-500">{testimonial.title}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta({ hasSession, onSignUp }: { hasSession: boolean; onSignUp: () => void }) {
  return (
    <section id="pricing" className="px-5 pb-24 sm:px-6">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent_45%),rgba(255,255,255,0.025)] p-8 text-center sm:p-12">
        <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
          Give your best sales rep a thousand hands.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-500">
          Launch a Kilobot agent for your inbox and start turning conversations into revenue this week.
        </p>
        <div className="mt-8 flex justify-center">
          <PrimaryCta hasSession={hasSession} onSignUp={onSignUp} label="Get started" />
        </div>
      </div>
    </section>
  );
}

function Footer({ hasSession, onSignIn }: { hasSession: boolean; onSignIn: () => void }) {
  return (
    <footer id="enterprise" className="border-t border-white/[0.06] px-5 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link to="/" className="flex items-center gap-2 text-[15px] font-medium tracking-tight text-white">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white text-[#050505]">
                <Sparkles className="size-4" />
              </span>
              Kilobot
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-7 text-zinc-500">
              AI inbox sales agents for commerce teams that need speed, context, and clean handoffs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-medium text-white">{group.title}</p>
                <div className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    <a key={link} href="#product" className="block text-sm text-zinc-500 transition-colors hover:text-white">
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500 sm:justify-start">
            <span>Copyright {new Date().getFullYear()} Kilobot</span>
            <span className="hidden text-zinc-700 sm:inline">/</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-1 text-xs">
              <ShieldCheck className="size-3.5" />
              SOC 2 ready
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] px-2.5 py-1 text-xs">
              EN
              <ChevronDown className="size-3" />
            </span>
          </div>
          {hasSession ? (
            <Link to={POST_LOGIN_REDIRECT} className="text-sm text-zinc-400 transition-colors hover:text-white">
              Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const { user, signIn, signUp } = useAuth();
  console.log(user);
  const hasSession = Boolean(user);

  const returnTo = { returnTo: POST_LOGIN_REDIRECT };
  const onSignIn = () => {
    void signIn({ state: returnTo });
  };
  const onSignUp = () => {
    void signUp({ state: returnTo });
  };

  return (
    <div className="min-h-[100svh] bg-[#060606] font-sans text-zinc-100 antialiased selection:bg-white/20 selection:text-white">
      <Nav hasSession={hasSession} onSignIn={onSignIn} onSignUp={onSignUp} />
      <main>
        <Hero hasSession={hasSession} onSignUp={onSignUp} />
        <SocialProof />
        <AgenticShowcase />
        <AutocompleteBreak />
        <ModelEcosystem />
        <ContextTimeline />
        <Testimonials />
        <FinalCta hasSession={hasSession} onSignUp={onSignUp} />
      </main>
      <Footer hasSession={hasSession} onSignIn={onSignIn} />
    </div>
  );
}
