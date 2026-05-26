import { useCallback, useEffect, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

export type IncomingTeamInvitation = {
  id: string;
  email: string;
  organizationId: string | null;
  organizationName: string;
  roleSlug: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export function usePendingTeamInvitations() {
  const listPending = useAction(api.teamInvitations.listPendingForCurrentUser);
  const reactiveCount = useQuery(api.teamInvitations.getPendingCount);
  const [invitations, setInvitations] = useState<IncomingTeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPending({});
      setInvitations(rows);
    } catch {
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  }, [listPending]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    invitations,
    loading,
    refresh,
    count: reactiveCount !== undefined ? reactiveCount : invitations.length,
  };
}
