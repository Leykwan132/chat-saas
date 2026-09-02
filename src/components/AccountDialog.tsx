import { useNavigate } from 'react-router';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';

/**
 * Sidebar footer button that navigates to the settings page.
 * Pass `settingsPath` to control where the settings route is mounted:
 *   - DashboardLayout:  `/dashboard/:agentId/settings`
 *   - WorkspacePage:    `/workspace/settings`
 */
export function AccountDialog({ settingsPath }: { settingsPath: string }) {
  const { user } = useAuth();
  const sidebar = useSidebar();
  const navigate = useNavigate();
  const collapsed = sidebar.state === 'collapsed';

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Account';
  const initials = getInitials(user?.firstName, user?.lastName, user?.email);
  const profilePicture = user?.profilePictureUrl ?? null;

  return (
    <SidebarMenuButton
      size="lg"
      tooltip={user?.email ?? 'Account'}
      onClick={() => navigate(settingsPath)}
      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
    >
      <Avatar src={profilePicture} initials={initials} />
      {!collapsed && (
        <div className="flex min-w-0 flex-col gap-0.5 leading-none">
          <span className="truncate font-semibold text-sm">{displayName}</span>
          <span className="truncate text-xs text-sidebar-foreground/60">
            {user?.email}
          </span>
        </div>
      )}
    </SidebarMenuButton>
  );
}

function Avatar({ src, initials }: { src: string | null; initials: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt="avatar"
        className="size-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
      {initials}
    </div>
  );
}

function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined,
) {
  const first = (firstName ?? '').trim().charAt(0);
  const last = (lastName ?? '').trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  return (email ?? '').trim().charAt(0).toUpperCase() || '•';
}
