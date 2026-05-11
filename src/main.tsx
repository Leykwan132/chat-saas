import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Routes, Route, useNavigate, useParams } from 'react-router'
import { AuthKitProvider, useAuth } from '@workos-inc/authkit-react'
import { ConvexProviderWithAuthKit } from '@convex-dev/workos'
import { ConvexReactClient } from 'convex/react'
import '@radix-ui/themes/styles.css'
import '@workos-inc/widgets/styles.css'
import './index.css'
import App from './App.tsx'
import DashboardLayout from './layouts/DashboardLayout.tsx'
import ChatsPage from './pages/ChatsPage.tsx'
import AgentPage from './pages/AgentPage.tsx'
import KnowledgeBasePage from './pages/KnowledgeBasePage.tsx'
import WorkspacePage, { AgentsIndex } from './pages/WorkspacePage.tsx'
import CustomersPage from './pages/CustomersPage.tsx'
import AnalyticsPage from './pages/AnalyticsPage.tsx'
import CreateAgentPage from './pages/CreateAgentPage.tsx'
import AccountPage from './pages/AccountPage.tsx'
import ChannelsPage from './pages/ChannelsPage.tsx'
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
const WORKOS_CLIENT_ID = import.meta.env.VITE_WORKOS_CLIENT_ID as string
const WORKOS_REDIRECT_URI = import.meta.env.VITE_WORKOS_REDIRECT_URI as
  | string
  | undefined

if (!WORKOS_CLIENT_ID) {
  throw new Error('Missing VITE_WORKOS_CLIENT_ID')
}

// Single source of truth for the destination users land on after a successful
// AuthKit sign-in or sign-up. Used by `onRedirectCallback` (default fallback),
// the `/login` route, and the SignInCard buttons in `App.tsx`.
export const POST_LOGIN_REDIRECT = '/workspace'

function OldAgentRedirect() {
  const { agentId, threadId } = useParams()
  return <Navigate to={`/dashboard/${agentId}/playground${threadId ? `/${threadId}` : ''}`} replace />
}

function KnowledgeBaseIndex() {
  const { agentId } = useParams()
  return <Navigate to={`/dashboard/${agentId}/knowledge-base/web`} replace />
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

function RootLayout() {
  const navigate = useNavigate()

  return (
    <AuthKitProvider
      clientId={WORKOS_CLIENT_ID}
      redirectUri={WORKOS_REDIRECT_URI}
      onRedirectCallback={({ state }) => {
        // AuthKit has already exchanged the code and stored tokens by the time
        // this fires. We just need to send the user to the right page and
        // strip the OAuth query params via `replace: true`.
        const returnTo = (state as { returnTo?: string } | undefined)?.returnTo
        navigate(returnTo ?? POST_LOGIN_REDIRECT, { replace: true })
      }}
    >
      <ConvexProviderWithAuthKit client={convex} useAuth={useAuth}>
        <TooltipProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/" element={<App />} />
            <Route path="/workspace" element={<WorkspacePage />}>
              <Route index element={<AgentsIndex />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
            <Route path="/create-agent" element={<CreateAgentPage />} />
            <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
            <Route path="/dashboard/:agentId" element={<DashboardLayout />}>
              <Route index element={<ChatsPage />} />
              <Route path="chats" element={<ChatsPage />} />
              <Route path="agent/:threadId?" element={<OldAgentRedirect />} />
              <Route path="playground/:threadId?" element={<AgentPage />} />
              <Route path="knowledge-base" element={<KnowledgeBaseIndex />} />
              <Route path="knowledge-base/:type" element={<KnowledgeBasePage />} />
              <Route path="channels" element={<ChannelsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="account" element={<AccountPage />} />
            </Route>
          </Routes>
          <Toaster />
        </TooltipProvider>
      </ConvexProviderWithAuthKit>
    </AuthKitProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RootLayout />
    </BrowserRouter>
  </StrictMode>,
)
