import { useEffect } from 'react';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import posthog from 'posthog-js';
import { useLocation } from 'react-router';
import { useHostBranding } from '@/hooks/useHostBranding';
import { applyDocumentFavicon, resolveHostFaviconHref } from '@/lib/hostFavicon';
import { applyDocumentTitle, resolveHostDocumentTitle } from '@/lib/hostDocumentTitle';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function HostFavicon() {
  const branding = useHostBranding();

  useEffect(() => {
    applyDocumentFavicon(resolveHostFaviconHref(branding?.logoUrl));
    applyDocumentTitle(resolveHostDocumentTitle(branding));
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
