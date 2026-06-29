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
  end?: boolean;
  tooltip?: string;
  icon: NavItem['icon'];
  label: string;
  badge?: ReactNode;
};

export function SidebarNavMenuItem({
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
