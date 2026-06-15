import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Routes, Route, useParams, useLocation } from 'react-router'
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react'
import { ConvexProviderWithAuthKit } from '@convex-dev/workos'
import { ConvexReactClient } from 'convex/react'
import '@radix-ui/themes/styles.css'
import '@workos-inc/widgets/styles.css'
import './styles/workos-widgets-overrides.css'
import './index.css'
import HomePage from './pages/HomePage.tsx'
import SignInPage from './pages/SignInPage.tsx'
import { POST_LOGIN_REDIRECT } from './constants'
import DashboardLayout from './layouts/DashboardLayout.tsx'
import ChatsPage from './pages/ChatsPage.tsx'
import AgentPage from './pages/AgentPage.tsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.tsx'
import WorkspacePage, { AgentsIndex } from './pages/WorkspacePage.tsx'
import CustomersPage from './pages/CustomersPage.tsx'
import CustomerDetailPage from './pages/CustomerDetailPage.tsx'
import AnalyticsPage from './pages/AnalyticsPage.tsx'
import LeaderboardPage from './pages/LeaderboardPage.tsx'
import CreateAgentPage from './pages/CreateAgentPage.tsx'
import CreateTeamPage from './pages/CreateTeamPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import InvitationsPage from './pages/InvitationsPage.tsx'
import ChannelsPage from './pages/ChannelsPage.tsx'
import ChannelWhatsAppTemplatesPage from './pages/ChannelWhatsAppTemplatesPage.tsx'
import TemplatesPage from './pages/TemplatesPage.tsx'
import TemplateDetailPage from './pages/TemplateDetailPage.tsx'
import AutomationsBroadcastPage from './pages/AutomationsBroadcastPage.tsx'
import AutomationsFollowUpPage from './pages/AutomationsFollowUpPage.tsx'
import BroadcastPage from './pages/BroadcastPage.tsx'
import BroadcastDetailPage from './pages/BroadcastDetailPage.tsx'
import FollowUpPage from './pages/FollowUpPage.tsx'
import FollowUpDetailPage from './pages/FollowUpDetailPage.tsx'
import LeadAssignmentPage from './pages/LeadAssignmentPage.tsx'
import CalendarPage from './pages/CalendarPage.tsx'
import AutoBookingPage from './pages/AutoBookingPage.tsx'
import AutoBookingServicePage from './pages/AutoBookingServicePage.tsx'
import SchedulePage from './pages/SchedulePage.tsx'
import ScheduleUserDetailPage from './pages/ScheduleUserDetailPage.tsx'
import ScheduleUserAvailabilityPage from './pages/ScheduleUserAvailabilityPage.tsx'
import InstructionsPage from './pages/InstructionsPage.tsx'
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { Spinner } from "@/components/ui/spinner"
import { ThemeProvider } from '@/components/theme-provider'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import PricingPage from './pages/PricingPage.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import PrivacyDeletionPage from './pages/PrivacyDeletionPage.tsx'
import TermsPage from './pages/TermsPage.tsx'
import { usePermissions } from './hooks/usePermissions'
import { Permission } from '../shared/permissions'
import { PromptInputProvider } from '@/components/ai-elements/prompt-input'
import QuickRepliesPage from './pages/QuickRepliesPage.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
const WORKOS_CLIENT_ID = import.meta.env.VITE_WORKOS_CLIENT_ID as string

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
const WORKOS_REDIRECT_URI = import.meta.env.VITE_WORKOS_REDIRECT_URI as
  | string
  | undefined

if (!WORKOS_CLIENT_ID) {
  throw new Error('Missing VITE_WORKOS_CLIENT_ID')
}

function OldAgentRedirect() {
  const { agentId, threadId } = useParams()
  return <Navigate to={`/dashboard/${agentId}/playground${threadId ? `/${threadId}` : ''}`} replace />
}

function KnowledgeBaseIndex() {
  const { agentId } = useParams()
  return <Navigate to={`/dashboard/${agentId}/knowledge-base/web`} replace />
}



/** Legacy sidebar URL; templates now live under Channels → channel. */
function WhatsappDemoTemplateRedirect() {
  const { agentId } = useParams()
  return <Navigate to={`/dashboard/${agentId}/channels`} replace />
}

function ChatsToInboxRedirect() {
  const { agentId } = useParams()
  return <Navigate to={`/dashboard/${agentId}/inbox`} replace />
}

function DashboardIndexRedirect() {
  const { agentId } = useParams()
  const { can, isLoading } = usePermissions()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background text-foreground">
        <Spinner className="h-8 w-8 text-zinc-500" />
      </div>
    )
  }

  if (can(Permission.CHATS_READ)) {
    return <Navigate to={`/dashboard/${agentId}/inbox`} replace />
  }
  if (can(Permission.PLAYGROUND_ACCESS)) {
    return <Navigate to={`/dashboard/${agentId}/playground`} replace />
  }
  if (can(Permission.KB_READ)) {
    return <Navigate to={`/dashboard/${agentId}/knowledge-base`} replace />
  }
  if (can(Permission.CUSTOMERS_READ)) {
    return <Navigate to={`/dashboard/${agentId}/customers`} replace />
  }
  if (can(Permission.CHANNELS_READ)) {
    return <Navigate to={`/dashboard/${agentId}/channels`} replace />
  }
  if (can(Permission.ANALYTICS_READ)) {
    return <Navigate to={`/dashboard/${agentId}/analytics`} replace />
  }

  return <Navigate to={`/dashboard/${agentId}/inbox`} replace />
}

// Sign-in endpoint registered with WorkOS as the "Sign-in endpoint" on the
// Redirects page. WorkOS-initiated flows (impersonation, third-party login)
// land here, and we kick off the OAuth flow immediately. Pass the post-login
// destination as `state.returnTo` so onRedirectCallback knows where to land.
function LoginRoute() {
  const { signIn } = useAuth()
  useEffect(() => {
    void signIn({ state: { returnTo: POST_LOGIN_REDIRECT } })
  }, [signIn])
  return null
}

function CallbackRoute() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-background text-foreground">
        <Spinner className="h-8 w-8 text-zinc-500" />
      </div>
    )
  }

  return <Navigate to={user ? POST_LOGIN_REDIRECT : '/'} replace />
}

function RootLayout() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthKitProvider
        clientId={WORKOS_CLIENT_ID}
        redirectUri={WORKOS_REDIRECT_URI}
        devMode={true}
      >
        <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
          <TooltipProvider>
            <ScrollToTop />
            <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/callback" element={<CallbackRoute />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/privacy/deletion" element={<PrivacyDeletionPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/onboarding" element={<OnboardingFlow />} />
            <Route path="/workspace" element={<WorkspacePage />}>
              <Route index element={<AgentsIndex />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
              <Route path="account" element={<Navigate to="../settings" replace />} />
            </Route>
            <Route path="/create-agent" element={<CreateAgentPage />} />
            <Route path="/create-team" element={<CreateTeamPage />} />
            <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
            <Route path="/dashboard/:agentId" element={<DashboardLayout />}>
              <Route index element={<DashboardIndexRedirect />} />
              <Route path="inbox" element={<PromptInputProvider><ChatsPage /></PromptInputProvider>} />
              <Route path="chats" element={<ChatsToInboxRedirect />} />
              <Route path="quick-replies" element={<QuickRepliesPage />} />
              <Route path="agent/:threadId?" element={<OldAgentRedirect />} />
              <Route path="playground/:threadId?" element={<AgentPage />} />
              <Route path="knowledge-base" element={<KnowledgeBaseIndex />} />
              <Route path="knowledge-base/:type" element={<KnowledgeBasePage />} />
              <Route path="channels" element={<ChannelsPage />} />
              <Route path="channels/:channelId/templates" element={<ChannelWhatsAppTemplatesPage />} />
              <Route path="whatsapp-demo/template" element={<WhatsappDemoTemplateRedirect />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:customerId" element={<CustomerDetailPage />} />
              <Route path="follow-ups" element={<FollowUpPage />} />
              <Route path="follow-ups/new" element={<AutomationsFollowUpPage />} />
              <Route path="follow-ups/:ruleId" element={<FollowUpDetailPage />} />
              <Route path="broadcast" element={<BroadcastPage />} />
              <Route path="broadcast/new" element={<AutomationsBroadcastPage />} />
              <Route path="broadcast/:scheduleId" element={<BroadcastDetailPage />} />
              <Route path="templates" element={<TemplatesPage />} />
              <Route path="templates/:templateName" element={<TemplateDetailPage />} />
              <Route path="availability" element={<SchedulePage />} />
              <Route
                path="availability/:workosUserId/edit"
                element={<ScheduleUserAvailabilityPage />}
              />
              <Route path="availability/:workosUserId" element={<ScheduleUserDetailPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="auto-booking/new" element={<AutoBookingServicePage />} />
              <Route path="auto-booking/:serviceId/edit" element={<AutoBookingServicePage />} />
              <Route path="auto-booking/:serviceId" element={<AutoBookingServicePage />} />
              <Route path="auto-booking" element={<AutoBookingPage />} />
              <Route path="lead-assignment" element={<LeadAssignmentPage />} />
              <Route path="instructions" element={<InstructionsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="account" element={<Navigate to="../settings" replace />} />
            </Route>
          </Routes>
          <Toaster />
        </TooltipProvider>
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
    </ThemeProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RootLayout />
    </BrowserRouter>
  </StrictMode>,
)
