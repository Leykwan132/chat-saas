import { useMemo, useState } from 'react';
import { Building2, ChevronRight, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getLandingPreviewSection,
  landingPreviewAgentName,
  landingPreviewWorkspaceName,
  type LandingPreviewSectionId,
} from './landingAppPreviewData';
import type { LandingPreviewNavKey } from './landingAppPreviewNav';
import { LandingAppPreviewSidebar } from './LandingAppPreviewSidebar';
import { LandingAppPreviewContent } from './LandingAppPreviewContent';

export function LandingAppPreview({
  hasSession,
  onSignUp,
}: {
  hasSession: boolean;
  onSignUp: () => void;
}) {
  const [activeNavKey, setActiveNavKey] = useState<LandingPreviewNavKey>('overview');
  const [activeSectionId, setActiveSectionId] = useState<LandingPreviewSectionId>('overview');
  const section = useMemo(
    () => getLandingPreviewSection(activeSectionId),
    [activeSectionId],
  );
  const showsSectionHeader = section.id !== 'workflow';

  return (
    <div
      data-testid="landing-app-preview"
      className="hidden overflow-hidden rounded-lg bg-white shadow-[0_0_15px_rgba(0,0,0,0.07)] ring-1 ring-zinc-200 md:block dark:bg-white dark:shadow-[0_0_15px_rgba(0,0,0,0.35)] dark:ring-white/10"
    >
      <div className="flex h-[720px] max-h-[78vh] min-h-[600px] bg-white text-zinc-950">
        <LandingAppPreviewSidebar
          activeKey={activeNavKey}
          hasSession={hasSession}
          onSignUp={onSignUp}
          onSelect={(key, sectionId) => {
            setActiveNavKey(key);
            setActiveSectionId(sectionId);
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Building2 className="size-4" />
              <span>{landingPreviewWorkspaceName}</span>
              <ChevronRight className="size-4" />
              <span>{landingPreviewAgentName}</span>
            </div>
            <div className="flex items-center">
              <div
                aria-label="Preview user profile"
                className="flex size-8 items-center justify-center rounded-full bg-zinc-950 text-white ring-2 ring-zinc-200"
              >
                <UserRound className="size-4" />
              </div>
            </div>
          </div>
          <div
            className={cn(
              'min-h-0 flex-1 overflow-hidden bg-white',
              section.id === 'workflow' ? 'p-0' : 'px-11 py-7',
            )}
          >
            <div className={cn('flex h-full min-h-0 flex-col', showsSectionHeader && 'gap-5')}>
              {showsSectionHeader ? (
                <div className="flex shrink-0 items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[28px] font-semibold tracking-tight text-zinc-950">
                      {section.title}
                    </h2>
                    {section.subtitle ? (
                      <p className="mt-1 text-sm text-zinc-500">{section.subtitle}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <LandingAppPreviewContent section={section} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
