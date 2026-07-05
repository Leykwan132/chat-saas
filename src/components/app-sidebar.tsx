import { useQuery } from 'convex/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
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
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { getNavItems, type NavItem } from './app-sidebar-nav';
import { SidebarNavMenuItem } from './app-sidebar-nav-item';

function formatUnreadBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  agent: Doc<'agents'>;
};

export function AppSidebar({ agent, ...props }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const { can, isLoading } = usePermissions();
  const navItems = getNavItems(agent._id);
  const canReadChats = !isLoading && can(Permission.CHATS_READ);
  const totalUnread = useQuery(
    api.conversations.getTotalUnreadForAgent,
    canReadChats ? { agentId: agent._id } : 'skip',
  );
  const canReadChannels = !isLoading && can(Permission.CHANNELS_READ);
  const connectedChannels = useQuery(
    api.channels.getConnectedForCurrentOrg,
    canReadChannels ? {} : 'skip',
  );
  const connectedChannelCount = connectedChannels?.length;

  const filterItems = (items: NavItem[]) => {
    if (isLoading) return [];
    return items.filter((item) => can(item.requiredPermission));
  };

  const topLevelItems = filterItems(navItems.topLevel);
  const engagementItems = filterItems(navItems.engagement);
  const bookingsItems = filterItems(navItems.bookings);
  const toolsItems = filterItems(navItems.tools);
  const teamItems = filterItems(navItems.team);
  const configurationItems = filterItems(navItems.configuration);

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
        <SidebarHeader className="flex flex-row items-center justify-between px-[0.9rem] py-[0.7875rem]">
          <a href="/workspace" className="flex items-center gap-[0.675rem]">
            <img src="/icon.svg" className="size-[1.35rem] dark:invert" alt="" />
            <div className="flex min-w-0 flex-col leading-none">
              <span className="text-[14.5px] font-semibold tracking-normal font-title">Kilobot</span>
            </div>
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="size-[1.8rem] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <PanelLeftClose className="size-[1.125rem]" />
            <span className="sr-only">Collapse Sidebar</span>
          </Button>
        </SidebarHeader>
      )}

      <SidebarContent className="gap-0">
        {topLevelItems.length > 0 && (
          <SidebarMenu className="p-[0.45rem] group-data-[collapsible=icon]:p-0">
            {topLevelItems.map((item) => (
              <SidebarNavMenuItem
                key={item.to}
                to={item.to}
                end={item.end}
                tooltip={item.label}
                icon={item.icon}
                label={item.label}
                badge={item.badge}
              />
            ))}
          </SidebarMenu>
        )}

        {configurationItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>AI Agent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configurationItems.map((item) => {
                  const showChannelCount =
                    item.label === 'Channels' &&
                    connectedChannelCount !== undefined &&
                    connectedChannelCount > 0;
                  const tooltip = showChannelCount
                    ? `${item.label} (${connectedChannelCount})`
                    : item.label;

                  return (
                    <SidebarNavMenuItem
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      tooltip={tooltip}
                      icon={item.icon}
                      label={item.label}
                      badge={
                        item.badge ??
                        (showChannelCount ? (
                          <span className="ml-auto flex size-[18px] shrink-0 items-center justify-center rounded-full bg-sidebar-accent-foreground/15 text-[10px] font-bold leading-none text-sidebar-foreground">
                            {connectedChannelCount}
                          </span>
                        ) : undefined)
                      }
                    />
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {bookingsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Bookings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {bookingsItems.map((item) => (
                  <SidebarNavMenuItem
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    tooltip={item.label}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {engagementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Engagement</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {engagementItems.map((item) => {
                  const showUnreadBadge =
                    item.label === 'Inbox' &&
                    totalUnread !== undefined &&
                    totalUnread > 0;
                  const tooltip =
                    showUnreadBadge
                      ? `${item.label} (${formatUnreadBadgeCount(totalUnread)})`
                      : item.label;

                  return (
                    <SidebarNavMenuItem
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      tooltip={tooltip}
                      icon={item.icon}
                      label={item.label}
                      badge={
                        showUnreadBadge ? (
                          <span className="ml-auto flex size-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
                            {formatUnreadBadgeCount(totalUnread)}
                          </span>
                        ) : undefined
                      }
                    />
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {teamItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Team</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {teamItems.map((item) => (
                  <SidebarNavMenuItem
                    key={item.to}
                    to={item.to}
                    end
                    tooltip={item.label}
                    icon={item.icon}
                    label={item.label}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {toolsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Tools</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {toolsItems.map((item) => (
                  <SidebarNavMenuItem
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    tooltip={item.label}
                    icon={item.icon}
                    label={item.label}
                    badge={item.badge}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-2">
        <CreditMeter />
        <WorkspaceSetupChecklist agentId={agent._id} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
