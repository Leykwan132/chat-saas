import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, createRoutesFromElements, Navigate, Route } from 'react-router'
import posthog from 'posthog-js'
import { PostHogProvider } from '@posthog/react'
import { ConvexReactClient } from 'convex/react'
import '@radix-ui/themes/styles.css'
import '@workos-inc/widgets/styles.css'
import './styles/workos-widgets-overrides.css'
import './index.css'
import HomePage from './pages/HomePage.tsx'
import SignInPage from './pages/SignInPage.tsx'
import DashboardLayout from './layouts/DashboardLayout.tsx'
import ChatsPage from './pages/ChatsPage.tsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.tsx'
import WorkspacePage, { AgentsIndex } from './pages/WorkspacePage.tsx'
import WorkspaceUsagePage from './pages/WorkspaceUsagePage.tsx'
import CustomersPage from './pages/CustomersPage.tsx'
import CustomerDetailPage from './pages/CustomerDetailPage.tsx'
import AgentOverviewPage from './pages/AgentOverviewPage.tsx'
import AnalyticsPage from './pages/AnalyticsPage.tsx'
import LeaderboardPage from './pages/LeaderboardPage.tsx'
import CreateAgentPage from './pages/CreateAgentPage.tsx'
import CreateTeamPage from './pages/CreateTeamPage.tsx'
import SettingsPage from './pages/SettingsPage.tsx'
import InvitationsPage from './pages/InvitationsPage.tsx'
import ChannelsPage from './pages/ChannelsPage.tsx'
import ChannelWhatsAppTemplatesPage from './pages/ChannelWhatsAppTemplatesPage.tsx'
import TemplatesPage from './pages/TemplatesPage.tsx'
import CreateTemplatePage from './pages/CreateTemplatePage.tsx'
import TemplateDetailPage from './pages/TemplateDetailPage.tsx'
import AutomationsBroadcastPage from './pages/AutomationsBroadcastPage.tsx'
import AutomationsFollowUpPage from './pages/AutomationsFollowUpPage.tsx'
import BroadcastPage from './pages/BroadcastPage.tsx'
import BroadcastDetailPage from './pages/BroadcastDetailPage.tsx'
import FollowUpPage from './pages/FollowUpPage.tsx'
import FollowUpDetailPage from './pages/FollowUpDetailPage.tsx'
import LeadAssignmentPage from './pages/LeadAssignmentPage.tsx'
import CalendarPage from './pages/CalendarPage.tsx'
import ServicesPage from './pages/ServicesPage.tsx'
import ServicePage from './pages/ServicePage.tsx'
import SchedulePage from './pages/SchedulePage.tsx'
import ScheduleUserDetailPage from './pages/ScheduleUserDetailPage.tsx'
import ScheduleUserAvailabilityPage from './pages/ScheduleUserAvailabilityPage.tsx'
import InstructionsPage from './pages/InstructionsPage.tsx'
import WorkflowPage from './pages/WorkflowPage.tsx'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import PricingPage from './pages/PricingPage.tsx'
import ContactPage from './pages/ContactPage.tsx'
import EarlyAdopterProgramPage from './pages/EarlyUserPage.tsx'
import AdminPage from './pages/AdminPage.tsx'
import PrivacyPage from './pages/PrivacyPage.tsx'
import PrivacyDeletionPage from './pages/PrivacyDeletionPage.tsx'
import TermsPage from './pages/TermsPage.tsx'
import BlogPostPage from './pages/BlogPostPage.tsx'
import { PromptInputProvider } from '@/components/ai-elements/prompt-input'
import {
  AnalyticsIndex,
  AppRootLayout,
  CallbackRoute,
  ChatsToInboxRedirect,
  DashboardIndexRedirect,
  KnowledgeBaseIndex,
  LoginRoute,
  OldAgentRedirect,
  PlaygroundRedirect,
} from '@/router/AppRouteComponents'
import { QuickRepliesFeatureRoute } from '@/router/QuickRepliesFeatureRoute'

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string,
  defaults: '2026-01-30',
})

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
const WORKOS_CLIENT_ID = import.meta.env.VITE_WORKOS_CLIENT_ID as string

const WORKOS_REDIRECT_URI = import.meta.env.VITE_WORKOS_REDIRECT_URI as
  | string
  | undefined

if (!WORKOS_CLIENT_ID) {
  throw new Error('Missing VITE_WORKOS_CLIENT_ID')
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route
      element={(
        <AppRootLayout
          convex={convex}
          workosClientId={WORKOS_CLIENT_ID}
          workosRedirectUri={WORKOS_REDIRECT_URI}
        />
      )}
    >
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/callback" element={<CallbackRoute />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/early-adopter-program" element={<EarlyAdopterProgramPage />} />
      <Route path="/early-user" element={<Navigate to="/early-adopter-program" replace />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/privacy/deletion" element={<PrivacyDeletionPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/onboarding" element={<OnboardingFlow />} />
      <Route path="/workspace" element={<WorkspacePage />}>
        <Route index element={<AgentsIndex />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="invitations" element={<InvitationsPage />} />
        <Route path="usage" element={<WorkspaceUsagePage />} />
        <Route path="account" element={<Navigate to="../settings" replace />} />
      </Route>
      <Route path="/create-agent" element={<CreateAgentPage />} />
      <Route path="/create-team" element={<CreateTeamPage />} />
      <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
      <Route path="/dashboard/:agentId" element={<DashboardLayout />}>
        <Route index element={<DashboardIndexRedirect />} />
        <Route path="inbox" element={<PromptInputProvider><ChatsPage /></PromptInputProvider>} />
        <Route path="chats" element={<ChatsToInboxRedirect />} />
        <Route path="quick-replies" element={<QuickRepliesFeatureRoute />} />
        <Route path="overview" element={<AgentOverviewPage />} />
        <Route path="agent/:threadId?" element={<OldAgentRedirect />} />
        <Route path="playground/:threadId?" element={<PlaygroundRedirect />} />
        <Route path="knowledge-base" element={<KnowledgeBaseIndex />} />
        <Route path="knowledge-base/:type" element={<KnowledgeBasePage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="channels/:channelId/templates" element={<ChannelWhatsAppTemplatesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="follow-ups" element={<FollowUpPage />} />
        <Route path="follow-ups/new" element={<AutomationsFollowUpPage />} />
        <Route path="follow-ups/:ruleId" element={<FollowUpDetailPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="broadcast/new" element={<AutomationsBroadcastPage />} />
        <Route path="broadcast/:scheduleId" element={<BroadcastDetailPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="templates/new" element={<CreateTemplatePage />} />
        <Route path="templates/:templateName" element={<TemplateDetailPage />} />
        <Route path="availability" element={<SchedulePage />} />
        <Route
          path="availability/:workosUserId/edit"
          element={<ScheduleUserAvailabilityPage />}
        />
        <Route path="availability/:workosUserId" element={<ScheduleUserDetailPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="services/new" element={<ServicePage />} />
        <Route path="services/:serviceId/edit" element={<ServicePage />} />
        <Route path="services/:serviceId" element={<ServicePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="lead-assignment" element={<LeadAssignmentPage />} />
        <Route path="agent-setup" element={<InstructionsPage />} />
        <Route path="workflow" element={<WorkflowPage />} />
        <Route path="analytics" element={<AnalyticsIndex />} />
        <Route path="analytics/:section" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="account" element={<Navigate to="../settings" replace />} />
      </Route>
    </Route>
  )
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <RouterProvider router={router} />
    </PostHogProvider>
  </StrictMode>,
)
