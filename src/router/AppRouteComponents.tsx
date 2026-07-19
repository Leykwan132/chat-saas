import { useEffect } from 'react';
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react';
import { ConvexProviderWithAuthKit } from '@convex-dev/workos';
import { useQuery, type ConvexReactClient } from 'convex/react';
import { Navigate, Outlet, useParams } from 'react-router';
import { api } from '../../convex/_generated/api';
import { POST_LOGIN_REDIRECT } from '@/constants';
import { PostHogIdentifier, ScrollToTop } from '@/components/AppRuntimeEffects';
import { ThemeProvider } from '@/components/theme-provider';
import { Spinner } from '@/components/ui/spinner';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { UpgradeModalProvider } from '@/components/UpgradeModal';
import { usePermissions } from '@/hooks/usePermissions';
import {
  getDefaultAnalyticsSection,
  type PlanKey,
} from '../../shared/planCatalog';
import { Permission } from '../../shared/permissions';

export function OldAgentRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/agent-setup`} replace />;
}

export function PlaygroundRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/agent-setup`} replace />;
}

export function KnowledgeBaseIndex() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/knowledge-base/web`} replace />;
}

export function AnalyticsIndex() {
  const { agentId } = useParams();
  const planAndUsage = useQuery(api.plans.getPlanAndUsage, {});

  if (planAndUsage === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  const section = getDefaultAnalyticsSection(
    (planAndUsage?.plan ?? 'free') as PlanKey,
  );
  return <Navigate to={`/dashboard/${agentId}/analytics/${section}`} replace />;
}

export function ChatsToInboxRedirect() {
  const { agentId } = useParams();
  return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
}

export function DashboardIndexRedirect() {
  const { agentId } = useParams();
  const { can, isLoading } = usePermissions();
  const planAndUsage = useQuery(api.plans.getPlanAndUsage, {});

  if (isLoading || planAndUsage === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background text-foreground">
        <Spinner className="h-8 w-8 text-zinc-500" />
      </div>
    );
  }

  if (can(Permission.CHATS_READ)) {
    return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
  }
  if (can(Permission.AGENTS_MANAGE)) {
    return <Navigate to={`/dashboard/${agentId}/agent-setup`} replace />;
  }
  if (can(Permission.KB_READ)) {
    return <Navigate to={`/dashboard/${agentId}/knowledge-base`} replace />;
  }
  if (can(Permission.PLAYGROUND_ACCESS)) {
    return <Navigate to={`/dashboard/${agentId}/knowledge-base/web`} replace />;
  }
  if (can(Permission.CUSTOMERS_READ)) {
    return <Navigate to={`/dashboard/${agentId}/customers`} replace />;
  }
  if (can(Permission.CHANNELS_READ)) {
    return <Navigate to={`/dashboard/${agentId}/channels`} replace />;
  }
  if (can(Permission.ANALYTICS_READ)) {
    const section = getDefaultAnalyticsSection(
      (planAndUsage?.plan ?? 'free') as PlanKey,
    );
    return <Navigate to={`/dashboard/${agentId}/analytics/${section}`} replace />;
  }

  return <Navigate to={`/dashboard/${agentId}/inbox`} replace />;
}

export function LoginRoute() {
  const { signIn } = useAuth();

  useEffect(() => {
    void signIn({ state: { returnTo: POST_LOGIN_REDIRECT } });
  }, [signIn]);

  return null;
}

export function CallbackRoute() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background text-foreground">
        <Spinner className="h-8 w-8 text-zinc-500" />
      </div>
    );
  }

  return <Navigate to={user ? POST_LOGIN_REDIRECT : '/'} replace />;
}

export function AppRootLayout({
  convex,
  workosClientId,
  workosRedirectUri,
}: {
  convex: ConvexReactClient;
  workosClientId: string;
  workosRedirectUri?: string;
}) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthKitProvider
        clientId={workosClientId}
        redirectUri={workosRedirectUri}
        devMode={true}
      >
        <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
          <TooltipProvider>
            <UpgradeModalProvider>
              <PostHogIdentifier />
              <ScrollToTop />
              <Outlet />
              <Toaster />
            </UpgradeModalProvider>
          </TooltipProvider>
        </ConvexProviderWithAuthKit>
      </AuthKitProvider>
    </ThemeProvider>
  );
}
