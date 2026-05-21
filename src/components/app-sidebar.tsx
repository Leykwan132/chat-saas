import { NavLink } from 'react-router';
import { MessageSquare, Bot, Users, BarChart3, Sparkles, BookOpen, Plug, Zap } from 'lucide-react';
import type { Doc } from '../../convex/_generated/dataModel';
import { CreditMeter } from '@/components/CreditMeter';
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
} from '@/components/ui/sidebar';

function getNavItems(agentId: string) {
  return {
    engagement: [
      { to: `/dashboard/${agentId}`, icon: MessageSquare, label: 'Chats', end: true },
      { to: `/dashboard/${agentId}/customers`, icon: Users, label: 'Customers' },
    ],
    configuration: [
      { to: `/dashboard/${agentId}/playground`, icon: Bot, label: 'Playground' },
      { to: `/dashboard/${agentId}/knowledge-base`, icon: BookOpen, label: 'Knowledge Base' },
      { to: `/dashboard/${agentId}/channels`, icon: Plug, label: 'Channels' },
      { to: `/dashboard/${agentId}/automations`, icon: Zap, label: 'Automations' },
    ],
    insights: [
      { to: `/dashboard/${agentId}/analytics`, icon: BarChart3, label: 'Analytics' },
    ],
  };
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  agent: Doc<'agents'>;
};

export function AppSidebar({ agent, ...props }: AppSidebarProps) {
  const navItems = getNavItems(agent._id);

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/workspace">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Sparkles className="size-4" />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-[15px] tracking-tight">Kilobot</span>
                  <span className="truncate text-xs text-sidebar-foreground/60">{agent.name}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Engagement</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.engagement.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>AI Agent</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.configuration.map((item) => (
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

        <SidebarGroup>
          <SidebarGroupLabel>Insights</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.insights.map((item) => (
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
      </SidebarContent>

      <SidebarFooter>
        <CreditMeter />
      </SidebarFooter>

      {/* Drag rail to resize */}
      <SidebarRail />
    </Sidebar>
  );
}
