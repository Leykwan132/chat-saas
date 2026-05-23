import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import { LogOut } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserProfileButton({ accountPath }: { accountPath: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const email = user?.email ?? 'Account';
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Account';
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

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-1 font-normal">
            <span className="text-sm font-semibold text-foreground">{displayName}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isSigningOut}
            onSelect={() => navigate(accountPath)}
          >
            Account detail
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
