import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Routes, Route, useNavigate } from 'react-router'
import { ClerkProvider, useAuth } from '@clerk/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import './index.css'
import App from './App.tsx'
import DashboardLayout from './layouts/DashboardLayout.tsx'
import ChatsPage from './pages/ChatsPage.tsx'
import AgentPage from './pages/AgentPage.tsx'
import WorkspacePage from './pages/WorkspacePage.tsx'
import CustomersPage from './pages/CustomersPage.tsx'
import AnalyticsPage from './pages/AnalyticsPage.tsx'
import CreateAgentPage from './pages/CreateAgentPage.tsx'
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key')
}

function RootLayout() {
  const navigate = useNavigate()

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <TooltipProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/workspace" element={<WorkspacePage />} />
            <Route path="/create-agent" element={<CreateAgentPage />} />
            <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
            <Route path="/dashboard/:agentId" element={<DashboardLayout />}>
              <Route index element={<ChatsPage />} />
              <Route path="chats" element={<ChatsPage />} />
              <Route path="agent/:threadId?" element={<AgentPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>
          </Routes>
          <Toaster />
        </TooltipProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RootLayout />
    </BrowserRouter>
  </StrictMode>,
)
