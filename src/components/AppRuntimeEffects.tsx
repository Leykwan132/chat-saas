import { useEffect } from 'react';
import { useAuth } from '@/partnerAuth/AppAuthProvider';
import posthog from 'posthog-js';
import { useLocation } from 'react-router';

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
