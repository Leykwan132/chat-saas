import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  PiArrowsSplit,
  PiBellRinging,
  PiBookOpen,
  PiBroadcast,
  PiCalendar,
  PiCalendarCheck,
  PiCalendarCheckFill,
  PiChartBar,
  PiChartBarFill,
  PiChartLineUp,
  PiChatCircleText,
  PiChatDots,
  PiChatDotsFill,
  PiClock,
  PiFileText,
  PiFlowArrow,
  PiGearSix,
  PiHouse,
  PiHouseFill,
  PiMegaphone,
  PiMegaphoneFill,
  PiPaperPlaneTilt,
  PiPlugs,
  PiRobot,
  PiRobotFill,
  PiShoppingCart,
  PiUserFocus,
  PiUsers,
} from 'react-icons/pi';
import { Permission, type PermissionSlug } from '../../shared/permissions';

export type NavItem = {
  to: string;
  icon: IconType;
  activeIcon?: IconType;
  label: string;
  end?: boolean;
  requiredPermission: PermissionSlug;
  badge?: ReactNode;
  badgeLabel?: string;
};

export type NavFeatureOptions = {
  showSavedReplies: boolean;
  enableAvatarFeature: boolean;
  enableCommentToInbox?: boolean;
};

export type NavSection = {
  label: string;
  icon: IconType;
  activeIcon?: IconType;
  items: NavItem[];
};

export function getNavItems(
  agentId: string,
  { showSavedReplies, enableAvatarFeature, enableCommentToInbox }: NavFeatureOptions,
): NavSection[] {
  return [
    {
      label: 'Overview',
      icon: PiHouse,
      items: [
        { to: `/dashboard/${agentId}/overview`, icon: PiHouse, activeIcon: PiHouseFill, label: 'Overview', requiredPermission: Permission.ANALYTICS_READ },
      ],
    },
    {
      label: 'Conversations',
      icon: PiChatDots,
      activeIcon: PiChatDotsFill,
      items: [
        { to: `/dashboard/${agentId}/inbox`, icon: PiChatCircleText, label: 'Inbox', end: true, requiredPermission: Permission.CHATS_READ },
        { to: `/dashboard/${agentId}/customers`, icon: PiUsers, label: 'Contacts', requiredPermission: Permission.CUSTOMERS_READ },
        ...(showSavedReplies
          ? [{ to: `/dashboard/${agentId}/quick-replies`, icon: PiChatDots, label: 'Quick Replies', requiredPermission: Permission.CHATS_READ }]
          : []),
      ],
    },
    {
      label: 'Agent',
      icon: PiRobot,
      activeIcon: PiRobotFill,
      items: [
        { to: `/dashboard/${agentId}/agent-setup`, icon: PiGearSix, label: 'Configuration', requiredPermission: Permission.AGENTS_MANAGE },
        { to: `/dashboard/${agentId}/knowledge-base`, icon: PiBookOpen, label: 'Knowledge Base', requiredPermission: Permission.KB_READ },
        { to: `/dashboard/${agentId}/workflow`, icon: PiFlowArrow, label: 'Workflow', requiredPermission: Permission.AGENTS_MANAGE },
        { to: `/dashboard/${agentId}/channels`, icon: PiPlugs, label: 'Channels', requiredPermission: Permission.CHANNELS_READ },
        ...(enableAvatarFeature
          ? [{ to: `/dashboard/${agentId}/avatar`, icon: PiUserFocus, label: 'Avatar', badgeLabel: 'Beta', requiredPermission: Permission.CHANNELS_READ }]
          : []),
      ],
    },
    {
      label: 'Bookings',
      icon: PiCalendarCheck,
      activeIcon: PiCalendarCheckFill,
      items: [
        { to: `/dashboard/${agentId}/calendar`, icon: PiCalendar, label: 'Calendar', requiredPermission: Permission.CALENDAR_READ },
        { to: `/dashboard/${agentId}/availability`, icon: PiClock, label: 'Availability', requiredPermission: Permission.AVAILABILITY_READ },
        { to: `/dashboard/${agentId}/services`, icon: PiShoppingCart, label: 'Services', end: true, requiredPermission: Permission.AUTOMATION_READ },
        { to: `/dashboard/${agentId}/lead-assignment`, icon: PiArrowsSplit, label: 'Routing', requiredPermission: Permission.ROUTING_READ },
      ],
    },
    {
      label: 'Outreach',
      icon: PiMegaphone,
      activeIcon: PiMegaphoneFill,
      items: [
        { to: `/dashboard/${agentId}/broadcast`, icon: PiBroadcast, label: 'Broadcast', requiredPermission: Permission.BROADCAST_READ },
        { to: `/dashboard/${agentId}/templates`, icon: PiFileText, label: 'Message Templates', requiredPermission: Permission.BROADCAST_READ },
        { to: `/dashboard/${agentId}/notifications`, icon: PiBellRinging, label: 'Notifications', requiredPermission: Permission.AGENTS_MANAGE },
        ...(enableCommentToInbox
          ? [{ to: `/dashboard/${agentId}/comment-to-inbox`, icon: PiPaperPlaneTilt, label: 'Comment-to-Inbox', requiredPermission: Permission.AUTOMATION_READ }]
          : []),
      ],
    },
    {
      label: 'Usage',
      icon: PiChartLineUp,
      items: [
        { to: `/dashboard/${agentId}/analytics`, icon: PiChartBar, activeIcon: PiChartBarFill, label: 'Agent Usage', requiredPermission: Permission.ANALYTICS_READ },
      ],
    },
  ];
}
