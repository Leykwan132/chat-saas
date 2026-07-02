import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Navigate, useNavigate, useParams } from 'react-router';
import {
  Bot,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  AnalyticsRangeToggle,
  AnalyticsSectionHeader,
  AnalyticsSectionHeaderSkeleton,
  AnalyticsSectionNav,
  TeamAnalyticsSkeleton,
} from '@/components/analytics/AnalyticsUi';
import { TeamAnalyticsContent } from '@/components/analytics/TeamAnalyticsContent';
import {
  UsageAnalyticsContent,
  UsageAnalyticsSkeleton,
} from '@/components/analytics/UsageAnalyticsContent';
import {
  ANALYTICS_RANGE_OPTIONS,
  type AnalyticsRange,
} from '@/components/analytics/analyticsRange';
import { pricingTableShellClass } from '@/components/pricing/pricingStyles';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { PLAN_CATALOG, getDefaultAnalyticsSection, type PlanKey } from '../../shared/planCatalog';
import { api } from '../../convex/_generated/api';

type AnalyticsSection = 'team' | 'usage';

const ANALYTICS_SECTIONS: Array<{
  section: AnalyticsSection;
  label: string;
  icon: React.ElementType;
  title: string;
  description: string;
}> = [
  {
    section: 'usage',
    label: 'AI Agent Usage',
    icon: Bot,
    title: 'AI Agent Usage',
    description: 'See how much token spend this agent has used across models over time.',
  },
  {
    section: 'team',
    label: 'Team Analytics',
    icon: Users,
    title: 'Team Analytics',
    description: 'Track team performance, channel conversions, and member outcomes.',
  },
];

function AccessDenied() {
  return (
    <div className={pricingTableShellClass}>
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-8 py-16 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Analytics access required
        </h2>
        <p className="max-w-md text-base text-muted-foreground">
          You do not have permission to view team analytics for this workspace.
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { agentId, section: rawSection } = useParams();
  const navigate = useNavigate();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const { can, isLoading: permissionsLoading } = usePermissions();
  const planAndUsage = useQuery(api.plans.getPlanAndUsage, {});
  const canReadAnalytics = !permissionsLoading && can(Permission.ANALYTICS_READ);

  const currentPlan = (planAndUsage?.plan ?? 'free') as PlanKey;
  const hasAgentUsage = Boolean(PLAN_CATALOG[currentPlan]?.features.agent_usage);
  const hasTeamAnalytics = Boolean(PLAN_CATALOG[currentPlan]?.features.team_analytics);
  const defaultSection = getDefaultAnalyticsSection(currentPlan);

  const visibleSections = useMemo(() => {
    if (planAndUsage === undefined) {
      return ANALYTICS_SECTIONS;
    }

    return ANALYTICS_SECTIONS.filter((item) => {
      if (item.section === 'usage') {
        return hasAgentUsage;
      }
      return hasTeamAnalytics;
    });
  }, [planAndUsage, hasAgentUsage, hasTeamAnalytics]);

  const section: AnalyticsSection =
    rawSection === 'usage' || rawSection === 'agent'
      ? 'usage'
      : 'team';

  if (rawSection === 'agent' && agentId) {
    return <Navigate to={`/dashboard/${agentId}/analytics/usage`} replace />;
  }

  if (
    rawSection &&
    rawSection !== 'team' &&
    rawSection !== 'usage' &&
    rawSection !== 'agent'
  ) {
    return <Navigate to={`/dashboard/${agentId}/analytics/${defaultSection}`} replace />;
  }

  if (planAndUsage !== undefined && section === 'team' && !hasTeamAnalytics) {
    return <Navigate to={`/dashboard/${agentId}/analytics/${defaultSection}`} replace />;
  }

  if (planAndUsage !== undefined && section === 'usage' && !hasAgentUsage) {
    const fallbackSection = hasTeamAnalytics ? 'team' : defaultSection;
    return <Navigate to={`/dashboard/${agentId}/analytics/${fallbackSection}`} replace />;
  }

  const activeSection =
    visibleSections.find((item) => item.section === section) ??
    ANALYTICS_SECTIONS.find((item) => item.section === section)!;

  if (!permissionsLoading && !canReadAnalytics) {
    return (
      <div className="flex w-full flex-col gap-8">
        <AccessDenied />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="grid gap-8 lg:grid-cols-[252px_1fr]">
        <AnalyticsSectionNav
          items={visibleSections.map((item) => ({
            id: item.section,
            label: item.label,
            icon: item.icon,
          }))}
          activeId={section}
          onSelect={(nextSection) =>
            navigate(`/dashboard/${agentId}/analytics/${nextSection}`)
          }
        />

        <div className="flex min-w-0 flex-col gap-8">
          {permissionsLoading ? (
            <>
              <AnalyticsSectionHeaderSkeleton />
              {section === 'team' ? (
                <TeamAnalyticsSkeleton />
              ) : (
                <UsageAnalyticsSkeleton />
              )}
            </>
          ) : (
            <>
              <AnalyticsSectionHeader
                title={activeSection.title}
                description={activeSection.description}
                action={
                  section === 'usage' ? undefined : (
                    <AnalyticsRangeToggle
                      value={range}
                      options={ANALYTICS_RANGE_OPTIONS}
                      onChange={setRange}
                    />
                  )
                }
              />

              {section === 'team' ? (
                <TeamAnalyticsContent range={range} />
              ) : agentId ? (
                <UsageAnalyticsContent agentId={agentId} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
