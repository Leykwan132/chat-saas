import { Link } from 'react-router';
import { Bot, LayoutDashboard, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POST_LOGIN_REDIRECT } from '@/constants';
import type { LandingPreviewSectionId } from './landingAppPreviewData';
import {
  getLandingPreviewNavTarget,
  landingPreviewNavItems,
  landingPreviewSidebarCta,
  type LandingPreviewNavKey,
} from './landingAppPreviewNav';
import {
  landingPreviewSidebarCtaCardClass,
  landingPreviewSidebarCtaInnerClass,
  landingPreviewSidebarCtaWrapperClass,
} from './landingAppPreviewSidebarStyles';

const navIcons = {
  overview: LayoutDashboard,
  agentSetup: Bot,
  workflow: Workflow,
} satisfies Record<LandingPreviewNavKey, typeof Bot>;

const primaryNavItems = landingPreviewNavItems.filter((item) => item.key === 'overview');
const agentNavItems = landingPreviewNavItems.filter((item) => item.key !== 'overview');

export function LandingAppPreviewSidebar({
  activeKey,
  hasSession,
  onSignUp,
  onSelect,
}: {
  activeKey: LandingPreviewNavKey;
  hasSession: boolean;
  onSignUp: () => void;
  onSelect: (key: LandingPreviewNavKey, sectionId: LandingPreviewSectionId) => void;
}) {
  return (
    <aside className="flex w-[224px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/80 text-zinc-950">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" className="size-5" />
          <span className="font-title text-sm font-semibold">Kilobot</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3">
        <div>
          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = navIcons[item.key];

              return (
                <button
                  key={item.key}
                  type="button"
                  data-preview-nav-key={item.key}
                  onClick={() => onSelect(item.key, getLandingPreviewNavTarget(item.key))}
                  className={cn(
                    'flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors',
                    activeKey === item.key
                      ? 'bg-zinc-200/70 text-zinc-950'
                      : 'text-zinc-700 hover:bg-zinc-200/45 hover:text-zinc-950',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 px-2 pb-1 text-[11px] font-medium text-zinc-500">
            AI Agent
          </div>
          <div className="space-y-1">
            {agentNavItems.map((item) => {
              const Icon = navIcons[item.key];

              return (
                <button
                  key={item.key}
                  type="button"
                  data-preview-nav-key={item.key}
                  onClick={() => onSelect(item.key, getLandingPreviewNavTarget(item.key))}
                  className={cn(
                    'flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] font-medium transition-colors',
                    activeKey === item.key
                      ? 'bg-zinc-200/70 text-zinc-950'
                      : 'text-zinc-700 hover:bg-zinc-200/45 hover:text-zinc-950',
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div
          data-preview-sidebar-cta
          className={landingPreviewSidebarCtaWrapperClass}
        >
          <div className={landingPreviewSidebarCtaCardClass}>
            <div className={landingPreviewSidebarCtaInnerClass}>
              <div>
                <p className="text-[14px] font-semibold leading-5 text-zinc-950">
                  {landingPreviewSidebarCta.title}
                </p>
                <p className="mt-2 text-[11px] leading-4 text-zinc-500">
                  {landingPreviewSidebarCta.description}
                </p>
              </div>
              {hasSession ? (
                <Link
                  to={POST_LOGIN_REDIRECT}
                  className="flex h-9 items-center justify-center rounded-full bg-zinc-950 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  Open dashboard
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onSignUp}
                  className="flex h-9 w-full items-center justify-center rounded-full bg-zinc-950 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-zinc-800"
                >
                  {landingPreviewSidebarCta.actionLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
