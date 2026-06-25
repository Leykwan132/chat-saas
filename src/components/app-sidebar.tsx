import { NavLink, useLocation } from 'react-router';
import { useQuery } from 'convex/react';
import { MessageSquare, Bot, Users, BarChart3, BookOpen, Plug, PanelLeftClose, PanelLeftOpen, UserRoundCheck, Calendar, Clock3, ReplyAll, Megaphone, MessageCircleReply, FileText, CalendarCheck, ChevronRight, Send, Shuffle } from 'lucide-react';
import type { Doc } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import { CreditMeter } from '@/components/CreditMeter';
import { Button } from '@/components/ui/button';
import { AiBadge } from '@/components/AiBadge';
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePermissions } from '../hooks/usePermissions';
import { Permission, type PermissionSlug } from '../../shared/permissions';

function formatUnreadBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

type NavItem = {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  requiredPermission: PermissionSlug;
  badge?: React.ReactNode;
};

function getNavItems(agentId: string): {
  engagement: NavItem[];
  tools: NavItem[];
  outreach: NavItem[];
  team: NavItem[];
  configuration: NavItem[];
} {
  return {
    engagement: [
      { to: `/dashboard/${agentId}/inbox`, icon: MessageSquare, label: 'Inbox', end: true, requiredPermission: Permission.CHATS_READ },
      { to: `/dashboard/${agentId}/calendar`, icon: Calendar, label: 'Calendar', requiredPermission: Permission.CALENDAR_READ },
      { to: `/dashboard/${agentId}/customers`, icon: Users, label: 'Contacts', requiredPermission: Permission.CUSTOMERS_READ },
    ],
    tools: [
      { to: `/dashboard/${agentId}/quick-replies`, icon: ReplyAll, label: 'Quick Replies', requiredPermission: Permission.CHATS_READ },
    ],
    outreach: [
      { to: `/dashboard/${agentId}/broadcast`, icon: Megaphone, label: 'Broadcast', requiredPermission: Permission.BROADCAST_READ },
      { to: `/dashboard/${agentId}/follow-ups`, icon: MessageCircleReply, label: 'Follow-ups', requiredPermission: Permission.FOLLOWUPS_READ },
      { to: `/dashboard/${agentId}/templates`, icon: FileText, label: 'Message Templates', requiredPermission: Permission.BROADCAST_READ },
    ],
    team: [
      { to: `/dashboard/${agentId}/lead-assignment`, icon: UserRoundCheck, label: 'Lead Assignment', requiredPermission: Permission.ROUTING_READ },
      { to: `/dashboard/${agentId}/availability`, icon: Clock3, label: 'Availability', requiredPermission: Permission.AVAILABILITY_READ },
      { to: `/dashboard/${agentId}/analytics`, icon: BarChart3, label: 'Analytics', requiredPermission: Permission.ANALYTICS_READ },
    ],
    configuration: [
      { to: `/dashboard/${agentId}/agent-setup`, icon: Bot, label: 'Agent Setup', requiredPermission: Permission.AGENTS_MANAGE },
      { to: `/dashboard/${agentId}/knowledge-base`, icon: BookOpen, label: 'Knowledge Base', requiredPermission: Permission.KB_READ },
      { to: `/dashboard/${agentId}/channels`, icon: Plug, label: 'Channels', requiredPermission: Permission.CHANNELS_READ },
      {
        to: `/dashboard/${agentId}/auto-booking`,
        icon: CalendarCheck,
        label: 'Auto Booking',
        end: true,
        requiredPermission: Permission.AUTOMATION_READ,
        badge: <AiBadge />,
      },
    ],
  };
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  agent: Doc<'agents'>;
};

type SidebarNavMenuItemProps = {
  to: string;
  end?: boolean;
  tooltip?: string;
  icon: NavItem['icon'];
  label: string;
  badge?: React.ReactNode;
};

function SidebarNavMenuItem({
  to,
  end,
  tooltip,
  icon: Icon,
  label,
  badge,
}: SidebarNavMenuItemProps) {
  const { state, setOpen } = useSidebar();

  return (
    <SidebarMenuItem>
      <NavLink
        to={to}
        end={end}
        onClick={() => {
          if (state === 'collapsed') {
            setOpen(true);
          }
        }}
      >
        {({ isActive }) => (
          <SidebarMenuButton asChild isActive={isActive} tooltip={tooltip}>
            {badge ? (
              <span className="flex w-full min-w-0 items-center gap-[0.45rem]">
                <Icon />
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate">{label}</span>
                  {badge}
                </span>
              </span>
            ) : (
              <span>
                <Icon />
                <span>{label}</span>
              </span>
            )}
          </SidebarMenuButton>
        )}
      </NavLink>
    </SidebarMenuItem>
  );
}

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

  const location = useLocation();
  const engagementItems = filterItems(navItems.engagement);
  const toolsItems = filterItems(navItems.tools);
  const outreachItems = filterItems(navItems.outreach);
  const teamItems = filterItems(navItems.team);
  const configurationItems = filterItems(navItems.configuration);

  const isOutreachActive = outreachItems.some((item) =>
    location.pathname.startsWith(item.to),
  );

  const isAssignmentActive = teamItems
    .filter((item) => item.label === 'Availability' || item.label === 'Lead Assignment')
    .some((item) => location.pathname.startsWith(item.to));

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Logo / Toggle */}
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

      {/* Nav */}
      <SidebarContent className="gap-0">
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
                {(() => {
                  const assignmentGroupItems = teamItems.filter(
                    (item) => item.label === 'Availability' || item.label === 'Lead Assignment'
                  );
                  const otherTeamItems = teamItems.filter(
                    (item) => item.label !== 'Availability' && item.label !== 'Lead Assignment'
                  );

                  return (
                    <>
                      {/* Assignment collapsible submenu */}
                      {assignmentGroupItems.length > 0 && (
                        <Collapsible
                          asChild
                          defaultOpen={isAssignmentActive}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton tooltip="Assignment">
                                <Shuffle />
                                <span>Assignment</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub className="border-l-0 pl-2">
                                {assignmentGroupItems.map((item) => (
                                  <SidebarMenuSubItem key={item.to}>
                                    <NavLink to={item.to} end>
                                      {({ isActive }) => (
                                        <SidebarMenuButton asChild isActive={isActive}>
                                          <span>
                                            <item.icon />
                                            <span>{item.label}</span>
                                          </span>
                                        </SidebarMenuButton>
                                      )}
                                    </NavLink>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      )}

                      {/* Other Team Items (Analytics, etc.) */}
                      {otherTeamItems.map((item) => (
                        <SidebarNavMenuItem
                          key={item.to}
                          to={item.to}
                          end
                          tooltip={item.label}
                          icon={item.icon}
                          label={item.label}
                        />
                      ))}
                    </>
                  );
                })()}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(toolsItems.length > 0 || outreachItems.length > 0) && (
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
                  />
                ))}

                {/* Outreach collapsible submenu */}
                {outreachItems.length > 0 && (
                  <Collapsible
                    asChild
                    defaultOpen={isOutreachActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Outreach">
                          <Send />
                          <span>Outreach</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-l-0 pl-2">
                          {outreachItems.map((item) => (
                            <SidebarMenuSubItem key={item.to}>
                              <NavLink to={item.to}>
                                {({ isActive }) => (
                                  <SidebarMenuButton asChild isActive={isActive}>
                                    <span>
                                      <item.icon />
                                      <span>{item.label}</span>
                                    </span>
                                  </SidebarMenuButton>
                                )}
                              </NavLink>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <CreditMeter />
      </SidebarFooter>

      {/* Drag rail to resize */}
      <SidebarRail />
    </Sidebar>
  );
}
