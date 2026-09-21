import { useQuery } from 'convex/react';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { PanelLeftOpen } from 'lucide-react';
import { useLocation } from 'react-router';
import type { Doc } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import { CreditMeter } from '@/components/CreditMeter';
import { WorkspaceSetupChecklist } from '@/components/setup-checklist/WorkspaceSetupChecklist';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { getNavItems } from './app-sidebar-nav';
import {
  isProductFeatureEnabled,
  isAvatarUserAllowed,
  isCommentToInboxUserAllowed,
  useEnableAvatarFeature,
  useEnableCommentToInboxFeature,
  useShowSavedReplies,
} from '@/lib/posthogFeatureFlags';
import { ExpandedAppSidebarHeader } from './ExpandedAppSidebarHeader';
import { HostBrandMark } from './HostBrandMark';
import { useHostBrand } from '@/hooks/useHostBranding';
import { SidebarScrollCue } from './SidebarScrollCue';
import { AgentSidebarNavigation } from './AgentSidebarNavigation';

function formatUnreadBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  agent: Doc<'agents'>;
};

export function AppSidebar({ agent, ...props }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const { pathname } = useLocation();
  const { can, isLoading } = usePermissions();
  const { user } = useAuth();
  const hostBrand = useHostBrand();
  const savedRepliesState = useShowSavedReplies();
  const avatarFeatureState = useEnableAvatarFeature();
  const commentToInboxFeatureState = useEnableCommentToInboxFeature();
  const navItems = getNavItems(agent._id, {
    showSavedReplies: isProductFeatureEnabled(savedRepliesState),
    enableAvatarFeature: isProductFeatureEnabled(avatarFeatureState) && isAvatarUserAllowed(user?.email),
    enableCommentToInbox: isProductFeatureEnabled(commentToInboxFeatureState) && isCommentToInboxUserAllowed(user?.email),
  });
  const canReadChats = !isLoading && can(Permission.CHATS_READ);
  const totalUnread = useQuery(
    api.conversations.getTotalUnreadForAgent,
    canReadChats ? { agentId: agent._id } : 'skip',
  );
  const visibleSections = isLoading
    ? []
    : navItems
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => can(item.requiredPermission)),
      }))
      .filter((section) => section.items.length > 0);

  return (
    <Sidebar collapsible="icon" {...props}>
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

      <div className="relative flex min-h-0 flex-1 flex-col">
      <SidebarContent className="gap-0">
        <AgentSidebarNavigation
          pathname={pathname}
          sections={visibleSections}
          totalUnread={totalUnread}
          formatUnreadBadgeCount={formatUnreadBadgeCount}
        />
      </SidebarContent>
        <SidebarScrollCue />
      </div>

      <SidebarFooter className="gap-0">
        <CreditMeter />
        <WorkspaceSetupChecklist agentId={agent._id} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
