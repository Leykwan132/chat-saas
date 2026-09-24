import { useEffect, useState } from 'react';
import { PiCaretDown } from 'react-icons/pi';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import type { NavItem, NavSection } from './app-sidebar-nav';
import { SidebarNavMenuItem } from './app-sidebar-nav-item';

type AgentSidebarNavigationProps = {
  pathname: string;
  sections: NavSection[];
  totalUnread: number | undefined;
  formatUnreadBadgeCount: (count: number) => string;
};

function isSectionActive(section: NavSection, pathname: string) {
  return section.items.some((item) => pathname.startsWith(item.to));
}

function getUnreadBadge(
  item: NavItem,
  totalUnread: number | undefined,
  formatUnreadBadgeCount: (count: number) => string,
) {
  if (item.label !== 'Inbox' || totalUnread === undefined || totalUnread <= 0) {
    return undefined;
  }

  const count = formatUnreadBadgeCount(totalUnread);

  return {
    tooltip: `${item.label} (${count})`,
    badge: (
      <span className="ml-auto flex size-[18px] shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
        {count}
      </span>
    ),
  };
}

export function AgentSidebarNavigation({
  pathname,
  sections,
  totalUnread,
  formatUnreadBadgeCount,
}: AgentSidebarNavigationProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.label, isSectionActive(section, pathname)])),
  );

  useEffect(() => {
    const activeSection = sections.find((section) => isSectionActive(section, pathname));
    if (!activeSection) return;

    setOpenSections((currentSections) => (
      currentSections[activeSection.label]
        ? currentSections
        : { ...currentSections, [activeSection.label]: true }
    ));
  }, [pathname, sections]);

  const renderItems = (items: NavItem[], className?: string) => items.map((item) => {
    const unread = getUnreadBadge(item, totalUnread, formatUnreadBadgeCount);

    return (
      <SidebarNavMenuItem
        key={item.to}
        to={item.to}
        className={className}
        end={item.end}
        tooltip={unread?.tooltip ?? (item.badgeLabel ? `${item.label} (${item.badgeLabel})` : item.label)}
        icon={item.icon}
        activeIcon={item.activeIcon}
        label={item.label}
        badge={unread?.badge ?? item.badge}
        badgeLabel={item.badgeLabel}
      />
    );
  });

  return (
    <>
      {sections.map((section) => {
        if (section.items.length === 1) {
          return (
            <SidebarGroup key={section.label} className="py-[0.15rem]">
              <SidebarMenu className="gap-0">{renderItems(section.items, 'px-[0.45rem] group-data-[collapsible=icon]:mx-[0.45rem] group-data-[collapsible=icon]:w-auto')}</SidebarMenu>
            </SidebarGroup>
          );
        }

        const SectionIcon = isSectionActive(section, pathname)
          ? (section.activeIcon ?? section.icon)
          : section.icon;
        const isOpen = openSections[section.label] ?? false;

        return (
          <Collapsible
            key={section.label}
            open={isOpen}
            onOpenChange={(open) => setOpenSections((currentSections) => ({
              ...currentSections,
              [section.label]: open,
            }))}
            className="group/section"
          >
            <SidebarGroup className="py-[0.15rem]">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={section.label} className="px-[0.45rem] group-data-[collapsible=icon]:mx-[0.45rem] group-data-[collapsible=icon]:w-auto">
                  <SectionIcon />
                  <span>{section.label}</span>
                  <PiCaretDown className="ml-auto transition-transform group-data-[state=closed]/section:rotate-[-90deg] group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
                <SidebarGroupContent className="pl-[0.9rem]">
                  <SidebarMenu className="gap-0">{renderItems(section.items)}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        );
      })}
    </>
  );
}
