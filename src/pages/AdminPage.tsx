import { useCallback, useEffect, useState } from 'react';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { LogOut } from 'lucide-react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { isValidEmailFormat } from '../../shared/emailValidation';
import { AdminAuthPanel } from '@/components/admin/AdminAuthPanel';
import { AdminContactRequestsTab } from '@/components/admin/AdminContactRequestsTab';
import { AdminUsageCostsTab } from '@/components/admin/AdminUsageCostsTab';
import {
  type AdminSession,
  clearStoredAdminSession,
  loadStoredAdminSession,
  storeAdminSession,
} from '@/components/admin/adminSession';

type AdminTab = 'contacts' | 'costs';

export default function AdminPage() {
  const convex = useConvex();
  const authenticateAdmin = useMutation(api.contactAdminAuth.authenticateAdmin);
  const logoutAdmin = useMutation(api.contactAdminAuth.logoutAdmin);
  const [session, setSession] = useState<AdminSession | null>(() => loadStoredAdminSession());
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('contacts');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const sessionToken = session?.token ?? '';
  const isAuthenticated = Boolean(sessionToken);
  const sessionValidation = useQuery(
    api.contactAdminAuth.validateAdminSession,
    isAuthenticated ? { sessionToken } : 'skip',
  );
  const canLoadAdminData = sessionValidation?.valid === true;

  const clearSession = useCallback(() => {
    clearStoredAdminSession();
    setSession(null);
    setAuthStep('email');
    setEmail('');
    setCode('');
  }, []);

  useEffect(() => {
    if (!isAuthenticated || sessionValidation === undefined || sessionValidation.valid) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      clearSession();
      toast.error('Your admin session expired. Please sign in again.');
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [clearSession, isAuthenticated, sessionValidation]);

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await logoutAdmin({ sessionToken });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to log out cleanly.');
    } finally {
      clearSession();
    }
  };

  const handleEmailSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Please enter your email.');
      return;
    }
    if (!isValidEmailFormat(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await convex.query(api.contactAdminAuth.checkAdminEmail, {
        email: trimmedEmail,
      });
      if (!result.allowed) {
        toast.error('This email is not authorized for admin access.');
        return;
      }
      setAuthStep('code');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to verify email.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleCodeSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();
    if (!trimmedEmail || !isValidEmailFormat(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      setAuthStep('email');
      return;
    }
    if (!trimmedCode) {
      toast.error('Please enter the admin code.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const result = await authenticateAdmin({
        email: trimmedEmail,
        code: trimmedCode,
      });
      const nextSession = { token: result.token, expiresAt: result.expiresAt };
      storeAdminSession(nextSession);
      setSession(nextSession);
      setCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isAuthenticated || sessionValidation?.valid === false) {
    return (
      <div className="flex min-h-[100svh] flex-col bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-[#060606] dark:text-zinc-100">
        <main className="flex flex-1 items-center justify-center px-5 py-16 sm:px-6">
          <AdminAuthPanel
            step={authStep}
            email={email}
            code={code}
            isSubmitting={isAuthenticating}
            onEmailChange={setEmail}
            onCodeChange={setCode}
            onEmailSubmit={() => void handleEmailSubmit()}
            onCodeSubmit={() => void handleCodeSubmit()}
            onBack={() => setAuthStep('email')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-[#060606] dark:text-zinc-100">
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-title text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
              Admin
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Review inbound requests and AI usage costs from one admin surface.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void handleLogout()} className="rounded-lg">
            <LogOut data-icon="inline-start" />
            Log out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className="mt-8">
          <TabsList variant="line">
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>
          <TabsContent value="contacts" className="pt-6">
            <AdminContactRequestsTab sessionToken={sessionToken} enabled={canLoadAdminData} />
          </TabsContent>
          <TabsContent value="costs" className="pt-6">
            <AdminUsageCostsTab sessionToken={sessionToken} enabled={canLoadAdminData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
