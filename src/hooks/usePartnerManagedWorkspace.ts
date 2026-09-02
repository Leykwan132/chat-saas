import { useQuery } from 'convex/react';
import { whiteLabelApi } from '@/lib/whiteLabelApi';

export function usePartnerManagedWorkspace(): boolean | undefined {
  return useQuery(whiteLabelApi.billing.isPartnerManagedCurrentWorkspace);
}
