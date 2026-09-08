import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { getClientTimeZone } from '@/lib/calendarTimeUtils';

export function useEnsureNativePersonalWorkspace(
  needsPersonalWorkspace: boolean | undefined,
) {
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);

  useEffect(() => {
    if (needsPersonalWorkspace !== true) {
      return;
    }
    void ensureCurrentUser({ timeZone: getClientTimeZone() });
  }, [ensureCurrentUser, needsPersonalWorkspace]);
}
