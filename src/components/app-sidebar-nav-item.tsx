import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import type { NavItem } from './app-sidebar-nav';

type SidebarNavMenuItemProps = {
  to: string;
  className?: string;
  end?: boolean;
  tooltip?: string;
  icon: NavItem['icon'];
  activeIcon?: NavItem['activeIcon'];
  label: string;
  badge?: ReactNode;
  badgeLabel?: string;
};

export function SidebarNavMenuItem({
  to,
  className,
  end,
  tooltip,
  icon: Icon,
  activeIcon: ActiveIcon,
  label,
  badge,
  badgeLabel,
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
          <SidebarMenuButton asChild className={className} isActive={isActive} tooltip={tooltip}>
            {badge || badgeLabel ? (
              <span className="flex w-full min-w-0 items-center gap-[0.45rem]">
                {isActive && ActiveIcon ? <ActiveIcon /> : <Icon />}
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate">{label}</span>
                  {badge}
                  {badgeLabel ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium leading-none text-muted-foreground">
                      {badgeLabel}
                    </span>
                  ) : null}
                </span>
              </span>
            ) : (
              <span>
                {isActive && ActiveIcon ? <ActiveIcon /> : <Icon />}
                <span>{label}</span>
              </span>
            )}
          </SidebarMenuButton>
        )}
      </NavLink>
    </SidebarMenuItem>
  );
}
