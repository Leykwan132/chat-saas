import { Link, useLocation } from 'react-router';
import { useQuery } from 'convex/react';
import {
  PanelLeftOpen,
} from 'lucide-react';
import {
  PiBriefcase,
  PiChartBar,
  PiEnvelope,
  PiGift,
  PiHandshake,
} from 'react-icons/pi';
import { CreditMeter } from '@/components/CreditMeter';
import { ExpandedAppSidebarHeader } from '@/components/ExpandedAppSidebarHeader';
import { HostBrandMark } from '@/components/HostBrandMark';
import { useHostBrand } from '@/hooks/useHostBranding';
import { WorkspaceSetupChecklist } from '@/components/setup-checklist/WorkspaceSetupChecklist';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePendingTeamInvitations } from '@/hooks/usePendingTeamInvitations';
import { usePartnerManagedWorkspace } from '@/hooks/usePartnerManagedWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import {
  isProductFeatureEnabled,
  useEnablePartnerPortal,
  useEnableReferralProgram,
} from '@/lib/posthogFeatureFlags';
import { cn } from '@/lib/utils';
import { Permission } from '../../../shared/permissions';
import { whiteLabelApi } from '@/lib/whiteLabelApi';

const workspaceSidebarMenuButtonClassName = 'px-[0.45rem] group-data-[collapsible=icon]:mx-[0.45rem] group-data-[collapsible=icon]:w-auto';

export function AgentsSidebar() {
  const { pathname } = useLocation();
  const isAgentsRoute = pathname === '/workspace';
  const isInvitationsRoute = pathname === '/workspace/invitations';
  const isUsageRoute = pathname === '/workspace/usage';
  const isReferralsRoute = pathname === '/workspace/referrals';
  const isPartnerRoute = pathname === '/workspace/partner';
  const { state, toggleSidebar } = useSidebar();
  const { count: pendingInvitationCount } = usePendingTeamInvitations();
  const { can } = usePermissions();
  const isPartnerManagedWorkspace = usePartnerManagedWorkspace();
  const referralProgramState = useEnableReferralProgram();
  const referralProgramEnabled =
    isProductFeatureEnabled(referralProgramState);
  const partnerPortalState = useEnablePartnerPortal();
  const partnerPortalEnabled = isProductFeatureEnabled(partnerPortalState);
  const partner = useQuery(whiteLabelApi.portal.getCurrentPartner);
  const hostBrand = useHostBrand();

  return (
    <Sidebar collapsible="icon">
      {state === 'collapsed' ? (
        <SidebarHeader className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="group/logo-toggle relative size-[1.8rem] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Expand sidebar"
          >
            <HostBrandMark
              brand={hostBrand}
              className={cn(
                'size-[1.35rem] transition-opacity duration-150',
                'group-hover/logo-toggle:opacity-0',
              )}
            />
            <PanelLeftOpen
              className={cn(
                'absolute size-[1.125rem] opacity-0 transition-opacity duration-150',
                'group-hover/logo-toggle:opacity-100',
              )}
            />
            <span className="sr-only">Expand Sidebar</span>
          </Button>
        </SidebarHeader>
      ) : (
        <ExpandedAppSidebarHeader onCollapse={toggleSidebar} brand={hostBrand} />
      )}

      <SidebarContent className="gap-0">
        <SidebarGroup className="py-[0.15rem]">
          <SidebarGroupContent>
            <SidebarMenu className="gap-[0.3rem]">
              <SidebarMenuItem>
                <SidebarMenuButton className={workspaceSidebarMenuButtonClassName} asChild isActive={isAgentsRoute} tooltip="Workspace">
                  <Link to="/workspace">
                    <PiBriefcase />
                    <span>Workspace</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {can(Permission.TEAM_MANAGE) && isPartnerManagedWorkspace === false && (
                <SidebarMenuItem>
                  <SidebarMenuButton className={workspaceSidebarMenuButtonClassName} asChild isActive={isInvitationsRoute} tooltip="Invitations">
                    <Link to="/workspace/invitations">
                      <PiEnvelope />
                      <span>Invitations</span>
                    </Link>
                  </SidebarMenuButton>
                  {pendingInvitationCount > 0 ? (
                    <SidebarMenuBadge className="bg-red-600 text-white peer-data-active/menu-button:!text-white">
                      {pendingInvitationCount}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton className={workspaceSidebarMenuButtonClassName} asChild isActive={isUsageRoute} tooltip="Workspace Usage">
                  <Link to="/workspace/usage">
                    <PiChartBar />
                    <span>Workspace Usage</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {partnerPortalEnabled && partner ? (
                <SidebarMenuItem>
                  <SidebarMenuButton className={workspaceSidebarMenuButtonClassName} asChild isActive={isPartnerRoute} tooltip="Partner">
                    <Link to="/workspace/partner">
                      <PiHandshake />
                      <span>Partner</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              {referralProgramEnabled && isPartnerManagedWorkspace === false ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className={workspaceSidebarMenuButtonClassName}
                    asChild
                    isActive={isReferralsRoute}
                    tooltip="Get Free Credits"
                  >
                    <Link to="/workspace/referrals">
                      <PiGift />
                      <span>Get Free Credits</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-0">
        <CreditMeter />
        <WorkspaceSetupChecklist />
      </SidebarFooter>
    </Sidebar>
  );
}
