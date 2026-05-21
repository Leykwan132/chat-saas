import { useNavigate } from 'react-router';
import { useAuth } from '@workos-inc/authkit-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function UserProfileButton({ accountPath }: { accountPath: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const email = user?.email ?? 'Account';
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Account';
  const initials = getInitials(user?.firstName, user?.lastName, user?.email);
  const profilePicture = user?.profilePictureUrl ?? null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate(accountPath)}
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
      </TooltipTrigger>
      <TooltipContent align="end" sideOffset={8}>
        <div className="flex flex-col gap-0.5 text-left text-background">
          <p className="text-xs font-semibold leading-none">{displayName}</p>
          <p className="text-[10px] leading-none opacity-80 mt-0.5">{email}</p>
        </div>
      </TooltipContent>
    </Tooltip>
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
