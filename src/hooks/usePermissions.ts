import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { type PermissionSlug } from '../../shared/permissions';

export function usePermissions() {
  const userAccess = useQuery(api.teamAccess.getCurrentUserAccess);

  const isLoading = userAccess === undefined;
  const permissions = userAccess?.permissions ?? [];
  const role = userAccess?.role ?? 'member';

  const can = (permission: PermissionSlug): boolean => {
    return permissions.includes(permission);
  };

  const canAny = (permissionSlugs: PermissionSlug[]): boolean => {
    return permissionSlugs.some((slug) => permissions.includes(slug));
  };

  const canAll = (permissionSlugs: PermissionSlug[]): boolean => {
    return permissionSlugs.every((slug) => permissions.includes(slug));
  };

  return {
    permissions,
    role,
    isLoading,
    can,
    canAny,
    canAll,
  };
}
