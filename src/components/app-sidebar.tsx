import { NavLink } from 'react-router';
import { MessageSquare, Bot, Users, BarChart3, BookOpen, Plug, Zap, PanelLeftClose, PanelLeftOpen, UserRoundCheck, Gamepad2, CalendarDays, MessageSquareQuote } from 'lucide-react';
import type { Doc } from '../../convex/_generated/dataModel';
import { CreditMeter } from '@/components/CreditMeter';
import { Button } from '@/components/ui/button';
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
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { usePermissions } from '../hooks/usePermissions';
import { Permission, type PermissionSlug } from '../../shared/permissions';

type NavItem = {
  to: string;
  icon: any;
  label: string;
  end?: boolean;
  requiredPermission: PermissionSlug;
};

function getNavItems(agentId: string): {
  engagement: NavItem[];
  people: NavItem[];
  configuration: NavItem[];
  insights: NavItem[];
} {
  return {
    engagement: [
      { to: `/dashboard/${agentId}`, icon: MessageSquare, label: 'Chats', end: true, requiredPermission: Permission.CHATS_READ },
      { to: `/dashboard/${agentId}/customers`, icon: Users, label: 'Customers', requiredPermission: Permission.CUSTOMERS_READ },
      { to: `/dashboard/${agentId}/quick-replies`, icon: MessageSquareQuote, label: 'Quick Replies', requiredPermission: Permission.CHATS_READ },
    ],
    people: [
      { to: `/dashboard/${agentId}/lead-assignment`, icon: UserRoundCheck, label: 'Lead Assignment', requiredPermission: Permission.ROUTING_READ },
      { to: `/dashboard/${agentId}/schedule`, icon: CalendarDays, label: 'Schedule', requiredPermission: Permission.SCHEDULE_READ },
    ],
    configuration: [
      { to: `/dashboard/${agentId}/playground`, icon: Gamepad2, label: 'Playground', requiredPermission: Permission.PLAYGROUND_ACCESS },
      { to: `/dashboard/${agentId}/instructions`, icon: Bot, label: 'Instructions', requiredPermission: Permission.AGENTS_MANAGE },
      { to: `/dashboard/${agentId}/knowledge-base`, icon: BookOpen, label: 'Knowledge Base', requiredPermission: Permission.KB_READ },
      { to: `/dashboard/${agentId}/channels`, icon: Plug, label: 'Channels', requiredPermission: Permission.CHANNELS_READ },
      { to: `/dashboard/${agentId}/automations`, icon: Zap, label: 'Automations', requiredPermission: Permission.AUTOMATION_READ },
    ],
    insights: [
      { to: `/dashboard/${agentId}/analytics`, icon: BarChart3, label: 'Analytics', requiredPermission: Permission.ANALYTICS_READ },
    ],
  };
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  agent: Doc<'agents'>;
};

export function AppSidebar({ agent, ...props }: AppSidebarProps) {
  const { state, toggleSidebar } = useSidebar();
  const { can, isLoading } = usePermissions();
  const navItems = getNavItems(agent._id);

  const filterItems = (items: NavItem[]) => {
    if (isLoading) return [];
    return items.filter((item) => can(item.requiredPermission));
  };

  const engagementItems = filterItems(navItems.engagement);
  const peopleItems = filterItems(navItems.people);
  const configurationItems = filterItems(navItems.configuration);
  const insightsItems = filterItems(navItems.insights);

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Logo / Toggle */}
      {state === 'collapsed' ? (
        <SidebarHeader className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="size-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <PanelLeftOpen className="size-5" />
            <span className="sr-only">Expand Sidebar</span>
          </Button>
        </SidebarHeader>
      ) : (
        <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3.5">
          <a href="/workspace" className="flex items-center gap-3">
            <img src="/icon.svg" className="size-6 dark:invert" />
            <div className="flex min-w-0 flex-col gap-0.5 leading-none">
              <span className="font-semibold text-[15px] tracking-tight">Kilobot</span>
              <span className="truncate text-xs text-sidebar-foreground/60">{agent.name}</span>
            </div>
          </a>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="size-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <PanelLeftClose className="size-5" />
            <span className="sr-only">Collapse Sidebar</span>
          </Button>
        </SidebarHeader>
      )}

      {/* Nav */}
      <SidebarContent>
        {engagementItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Engagement</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {engagementItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} end={item.end}>
                      {({ isActive }) => (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                        >
                          <span>
                            <item.icon />
                            <span>{item.label}</span>
                          </span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {configurationItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>AI Agent</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configurationItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} end={item.label === 'Playground'}>
                      {({ isActive }) => (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                        >
                          <span>
                            <item.icon />
                            <span>{item.label}</span>
                          </span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {peopleItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>People</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {peopleItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} end>
                      {({ isActive }) => (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                        >
                          <span>
                            <item.icon />
                            <span>{item.label}</span>
                          </span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {insightsItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Insights</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {insightsItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <NavLink to={item.to} end>
                      {({ isActive }) => (
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                        >
                          <span>
                            <item.icon />
                            <span>{item.label}</span>
                          </span>
                        </SidebarMenuButton>
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                ))}
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

