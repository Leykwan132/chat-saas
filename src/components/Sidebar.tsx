import { NavLink } from 'react-router';
import {
  MessageSquare,
  Bot,
  Users,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { to: '/dashboard', icon: MessageSquare, label: 'Chats', end: true },
  { to: '/dashboard/agents', icon: Bot, label: 'AI Agents' },
  { to: '/dashboard/customers', icon: Users, label: 'Customers' },
  { to: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`sidebar-transition flex flex-col border-r border-sidebar-border bg-sidebar h-screen sticky top-0 ${collapsed ? 'w-[68px]' : 'w-[260px]'
        }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 border-b border-sidebar-border px-4 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold text-sidebar-foreground tracking-tight truncate">
            ChatSaaS
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        <div className={`mb-2 ${collapsed ? 'hidden' : 'block'}`}>
          <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-muted px-2.5">
            Menu
          </span>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `nav-link flex items-center gap-3 rounded-lg text-[14px] ${collapsed ? 'justify-center px-2 py-2.5' : 'px-2.5 py-2'
              } ${isActive
                ? 'active'
                : 'text-sidebar-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-sidebar-accent-foreground' : ''
                    }`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onToggle}
          className="nav-link flex items-center gap-3 rounded-lg text-sidebar-muted text-[13px] w-full cursor-pointer bg-transparent border-none px-2.5 py-2"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
        >
          {collapsed ? (
            <PanelLeft className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
          ) : (
            <>
              <PanelLeftClose className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.5} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
