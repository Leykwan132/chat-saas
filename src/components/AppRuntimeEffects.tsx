import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import posthog from 'posthog-js';
import { useLocation } from 'react-router';
import { api } from '../../convex/_generated/api';
import { applyDocumentFavicon, resolveHostFaviconHref } from '@/lib/hostFavicon';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function HostFavicon() {
  const hostname = window.location.hostname;
  const isNativeHost =
    hostname === 'kilobot.app' ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost');
  const branding = useQuery(
    api.whiteLabel.partnerAuthGateway.getBrandingForHostname,
    isNativeHost ? 'skip' : { hostname },
  );

  useEffect(() => {
    applyDocumentFavicon(resolveHostFaviconHref(branding?.logoUrl));
  }, [branding]);

  return null;
}

export function PostHogIdentifier() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    posthog.identify(user.id, {
      email: user.email,
      name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || undefined,
    });
  }, [user]);

  return null;
}
