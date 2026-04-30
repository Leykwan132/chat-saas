import { Outlet, Navigate } from 'react-router';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppSidebar } from '@/components/app-sidebar';

function DashboardContent() {
  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          {/* Top header */}
          <header className="flex items-center h-14 px-4 sticky top-0 z-10 bg-background border-b border-border/50">
            <SidebarTrigger className="-ml-1" />
          </header>

          {/* Page content */}
          <main className="flex-1 px-14 py-8 md:px-12 lg:px-28 overflow-auto">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export default function DashboardLayout() {
  return (
    <>
      <AuthLoading>
        <div className="flex items-center justify-center min-h-[100svh] bg-background">
          <Loader2 className="w-8 h-8 text-muted-foreground loader-spin" />
        </div>
      </AuthLoading>

      <Unauthenticated>
        <Navigate to="/" replace />
      </Unauthenticated>

      <Authenticated>
        <DashboardContent />
      </Authenticated>
    </>
  );
}
