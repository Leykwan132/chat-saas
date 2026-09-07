import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { isNativeHost, toHostBrand } from '@/lib/hostBranding';

export function useHostBranding() {
  const hostname = window.location.hostname;
  const native = isNativeHost(hostname);
  const branding = useQuery(
    api.whiteLabel.partnerAuthGateway.getBrandingForHostname,
    native ? 'skip' : { hostname },
  );
  return native ? null : branding;
}

export function useHostBrand() {
  return toHostBrand(useHostBranding());
}
