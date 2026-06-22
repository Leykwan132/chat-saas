import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { useQuery } from 'convex/react';
import { LogOut, Settings } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { TeamsAccountSubmenu, accountMenuProfileRowClassName } from '@/components/TeamsAccountSubmenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '../../convex/_generated/api';
import { PLAN_CATALOG, type PlanKey } from '../../shared/planCatalog';

const accountMenuAvatarClassName = 'size-10 shrink-0 rounded-full object-cover';

export function UserProfileButton({ settingsPath }: { settingsPath: string }) {
  const { user, signOut, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const currentUser = useQuery(api.users.currentUser, isAuthLoading ? 'skip' : {});

  const email = user?.email ?? 'Account';
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Account';
  const planLabel =
    currentUser?.plan != null
      ? PLAN_CATALOG[currentUser.plan as PlanKey]?.name
      : null;
  const initials = getInitials(user?.firstName, user?.lastName, user?.email);
  const profilePicture = user?.profilePictureUrl ?? null;

  const handleSignOut = useCallback(() => {
    void (async () => {
      setIsSigningOut(true);
      try {
        const result = signOut({
          returnTo: `${window.location.origin}/`,
          navigate: false,
        });
        if (
          result !== undefined &&
          typeof (result as Promise<void>).then === 'function'
        ) {
          await (result as Promise<void>);
        }
        window.location.replace('/');
      } catch {
        setIsSigningOut(false);
      }
    })();
  }, [signOut]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="relative flex size-8 shrink-0 select-none items-center justify-center rounded-full border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            aria-label={displayName}
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={displayName}
                className="aspect-square h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {initials}
              </div>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72 p-2">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
            Account
          </DropdownMenuLabel>

          <div className={accountMenuProfileRowClassName}>
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={displayName}
                className={accountMenuAvatarClassName}
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
                {planLabel ? (
                  <Badge
                    variant="secondary"
                    className="shrink-0 rounded-md px-1.5 py-0 text-[10px] font-medium"
                  >
                    {planLabel}
                  </Badge>
                ) : null}
              </div>
              <div className="truncate text-xs text-muted-foreground">{email}</div>
            </div>
          </div>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuLabel className="px-2 py-1.5 text-xs font-normal text-muted-foreground">
            Teams
          </DropdownMenuLabel>
          <TeamsAccountSubmenu settingsPath={settingsPath} />

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuItem
            disabled={isSigningOut}
            onSelect={() => navigate(settingsPath)}
          >
            <Settings className="size-4" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuItem
            variant="destructive"
            disabled={isSigningOut}
            onSelect={handleSignOut}
          >
            {isSigningOut ? (
              <Spinner className="size-4" />
            ) : (
              <LogOut className="size-4" />
            )}
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isSigningOut && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/80 backdrop-blur-sm">
          <Spinner className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Signing out…</p>
        </div>
      )}
    </>
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
