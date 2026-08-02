import { Link, useLocation } from 'react-router';
import {
  BarChart3,
  Bot,
  Gift,
  Mail,
  PanelLeftOpen,
} from 'lucide-react';
import { CreditMeter } from '@/components/CreditMeter';
import { ExpandedAppSidebarHeader } from '@/components/ExpandedAppSidebarHeader';
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
import { usePermissions } from '@/hooks/usePermissions';
import {
  isProductFeatureEnabled,
  useEnableReferralProgram,
} from '@/lib/posthogFeatureFlags';
import { cn } from '@/lib/utils';
import { Permission } from '../../../shared/permissions';

export function AgentsSidebar() {
  const { pathname } = useLocation();
  const isAgentsRoute = pathname === '/workspace';
  const isInvitationsRoute = pathname === '/workspace/invitations';
  const isUsageRoute = pathname === '/workspace/usage';
  const isReferralsRoute = pathname === '/workspace/referrals';
  const { state, toggleSidebar } = useSidebar();
  const { count: pendingInvitationCount } = usePendingTeamInvitations();
  const { can } = usePermissions();
  const referralProgramState = useEnableReferralProgram();
  const referralProgramEnabled =
    isProductFeatureEnabled(referralProgramState);

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
            <img
              src="/icon.svg"
              alt=""
              className={cn(
                'size-[1.35rem] dark:invert transition-opacity duration-150',
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
        <ExpandedAppSidebarHeader onCollapse={toggleSidebar} />
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isAgentsRoute} tooltip="Agents">
                  <Link to="/workspace">
                    <Bot />
                    <span>Agents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {can(Permission.TEAM_MANAGE) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isInvitationsRoute} tooltip="Invitations">
                    <Link to="/workspace/invitations">
                      <Mail />
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
                <SidebarMenuButton asChild isActive={isUsageRoute} tooltip="Usage">
                  <Link to="/workspace/usage">
                    <BarChart3 />
                    <span>Usage</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {referralProgramEnabled ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isReferralsRoute}
                    tooltip="Get Free Credits"
                  >
                    <Link to="/workspace/referrals">
                      <Gift />
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
