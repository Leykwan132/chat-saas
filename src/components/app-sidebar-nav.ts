import type { ReactNode } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  Calendar,
  CalendarCheck,
  Clock3,
  LayoutDashboard,
  FileText,
  Megaphone,
  MessageSquare,
  Plug,
  ReplyAll,
  ScanFace,
  UserRoundCheck,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { Permission, type PermissionSlug } from '../../shared/permissions';

export type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  requiredPermission: PermissionSlug;
  badge?: ReactNode;
  badgeLabel?: string;
};

export type NavFeatureOptions = {
  showSavedReplies: boolean;
  enableAvatarFeature: boolean;
};

export function getNavItems(
  agentId: string,
  { showSavedReplies, enableAvatarFeature }: NavFeatureOptions,
): {
  topLevel: NavItem[];
  engagement: NavItem[];
  bookings: NavItem[];
  tools: NavItem[];
  team: NavItem[];
  configuration: NavItem[];
} {
  return {
    topLevel: [
      { to: `/dashboard/${agentId}/overview`, icon: LayoutDashboard, label: 'Overview', requiredPermission: Permission.ANALYTICS_READ },
    ],
    engagement: [
      { to: `/dashboard/${agentId}/inbox`, icon: MessageSquare, label: 'Inbox', end: true, requiredPermission: Permission.CHATS_READ },
      { to: `/dashboard/${agentId}/customers`, icon: Users, label: 'Contacts', requiredPermission: Permission.CUSTOMERS_READ },
    ],
    bookings: [
      { to: `/dashboard/${agentId}/calendar`, icon: Calendar, label: 'Calendar', requiredPermission: Permission.CALENDAR_READ },
      { to: `/dashboard/${agentId}/availability`, icon: Clock3, label: 'Availability', requiredPermission: Permission.AVAILABILITY_READ },
      { to: `/dashboard/${agentId}/services`, icon: CalendarCheck, label: 'Services', end: true, requiredPermission: Permission.AUTOMATION_READ },
    ],
    tools: [
      ...(enableAvatarFeature
        ? [{
            to: `/dashboard/${agentId}/avatar`,
            icon: ScanFace,
            label: 'Avatar',
            badgeLabel: 'Beta',
            requiredPermission: Permission.CHANNELS_READ,
          }]
        : []),
      ...(showSavedReplies
        ? [{
            to: `/dashboard/${agentId}/quick-replies`,
            icon: ReplyAll,
            label: 'Quick Replies',
            requiredPermission: Permission.CHATS_READ,
          }]
        : []),
      { to: `/dashboard/${agentId}/broadcast`, icon: Megaphone, label: 'Broadcast', requiredPermission: Permission.BROADCAST_READ },
      { to: `/dashboard/${agentId}/templates`, icon: FileText, label: 'Message Templates', requiredPermission: Permission.BROADCAST_READ },
    ],
    team: [
      { to: `/dashboard/${agentId}/lead-assignment`, icon: UserRoundCheck, label: 'Lead Assignment', requiredPermission: Permission.ROUTING_READ },
      { to: `/dashboard/${agentId}/analytics`, icon: BarChart3, label: 'Analytics', requiredPermission: Permission.ANALYTICS_READ },
    ],
    configuration: [
      { to: `/dashboard/${agentId}/agent-setup`, icon: Bot, label: 'Agent Setup', requiredPermission: Permission.AGENTS_MANAGE },
      { to: `/dashboard/${agentId}/knowledge-base`, icon: BookOpen, label: 'Knowledge Base', requiredPermission: Permission.KB_READ },
      { to: `/dashboard/${agentId}/workflow`, icon: Workflow, label: 'Workflow', requiredPermission: Permission.AGENTS_MANAGE },
      { to: `/dashboard/${agentId}/channels`, icon: Plug, label: 'Channels', requiredPermission: Permission.CHANNELS_READ },
    ],
  };
}
