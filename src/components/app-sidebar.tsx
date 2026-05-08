import { NavLink, useLocation } from 'react-router';
import { useUser, UserButton } from '@clerk/react';
import { MessageSquare, Bot, Users, BarChart3, Sparkles, BookOpen, Globe, FileText, AlignLeft, HelpCircle, ChevronRight } from 'lucide-react';
import type { Doc } from '../../convex/_generated/dataModel';
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
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

function getNavItems(agentId: string) {
  return {
    engagement: [
      { to: `/dashboard/${agentId}`, icon: MessageSquare, label: 'Chats', end: true },
      { to: `/dashboard/${agentId}/customers`, icon: Users, label: 'Customers' },
    ],
    configuration: [
      { to: `/dashboard/${agentId}/playground`, icon: Bot, label: 'Playground' },
    ],
    knowledgeBase: {
      to: `/dashboard/${agentId}/knowledge-base`,
      icon: BookOpen,
      label: 'Knowledge Base',
      children: [
        { to: `/dashboard/${agentId}/knowledge-base/web`, icon: Globe, label: 'Web' },
        { to: `/dashboard/${agentId}/knowledge-base/file`, icon: FileText, label: 'Files' },
        { to: `/dashboard/${agentId}/knowledge-base/text`, icon: AlignLeft, label: 'Text' },
        { to: `/dashboard/${agentId}/knowledge-base/qa`, icon: HelpCircle, label: 'Q&A' },
      ],
    },
    insights: [
      { to: `/dashboard/${agentId}/analytics`, icon: BarChart3, label: 'Analytics' },
    ],
  };
}

function UserFooter() {
  const { user } = useUser();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <SidebarMenuButton
      size="lg"
      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      tooltip={user?.primaryEmailAddress?.emailAddress ?? 'Account'}
    >
      <UserButton
        appearance={{ elements: { avatarBox: 'w-8 h-8' } }}
      />
      {!collapsed && (
        <div className="flex flex-col gap-0.5 leading-none min-w-0">
          <span className="truncate font-semibold text-sm">
            {user?.fullName ?? 'Account'}
          </span>
          <span className="truncate text-xs text-sidebar-foreground/60">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
        </div>
      )}
    </SidebarMenuButton>
  );
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  agent: Doc<'agents'>;
};

export function AppSidebar({ agent, ...props }: AppSidebarProps) {
  const navItems = getNavItems(agent._id);
  const location = useLocation();
  const isKnowledgeBaseActive = location.pathname.includes('/knowledge-base/');

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
                  <span className="font-semibold text-[15px] tracking-tight">ChatSaaS</span>
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
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.configuration.map((item) => (
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

              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={navItems.knowledgeBase.label} isActive={isKnowledgeBaseActive}>
                      <navItems.knowledgeBase.icon />
                      <span>{navItems.knowledgeBase.label}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {navItems.knowledgeBase.children.map((child) => (
                        <SidebarMenuSubItem key={child.label}>
                          <SidebarMenuSubButton asChild className="h-auto py-2">
                            <NavLink to={child.to} end>
                              <child.icon className="size-3.5" />
                              <span>{child.label}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
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
        <SidebarMenu>
          <SidebarMenuItem>
            <UserFooter />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Drag rail to resize */}
      <SidebarRail />
    </Sidebar>
  );
}
