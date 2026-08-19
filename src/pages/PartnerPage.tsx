import { useMemo, useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { ExternalLink, Plus, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { whiteLabelApi } from '@/lib/whiteLabelApi';

const planOptions = ['free', 'starter', 'growth', 'business'] as const;

export default function PartnerPage() {
  const partner = useQuery(whiteLabelApi.portal.getCurrentPartner);
  const overview = useQuery(whiteLabelApi.portal.getOverview, partner ? {} : 'skip');
  const createOrganization = useAction(whiteLabelApi.actions.createOrganization);
  const inviteAccount = useAction(whiteLabelApi.actions.inviteOrganizationAccount);
  const grantCredits = useMutation(whiteLabelApi.portal.grantCredits);
  const assignPlan = useMutation(whiteLabelApi.portal.assignOrganizationPlan);
  const setStatus = useMutation(whiteLabelApi.portal.setOrganizationStatus);
  const updateBrand = useMutation(whiteLabelApi.portal.updateBrandAndDomain);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationPlan, setOrganizationPlan] = useState<(typeof planOptions)[number]>('starter');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [brandName, setBrandName] = useState('');
  const [hostname, setHostname] = useState('');

  const selectedOrganization = useMemo(() => {
    const organizations = overview?.organizations ?? [];
    return organizations.find((organization) => organization.partnerOrganizationId === selectedOrganizationId) ?? organizations[0];
  }, [overview?.organizations, selectedOrganizationId]);
  const organizations = overview?.organizations ?? [];

  if (partner === undefined) return <main className="p-8 text-sm text-muted-foreground">Loading partner portal…</main>;
  if (partner === null) return <main className="p-8 text-sm text-muted-foreground">Partner access is not available in this workspace.</main>;

  const run = async (work: () => Promise<unknown>, success: string) => {
    try { await work(); toast.success(success); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to complete this request.'); }
  };

  return (
    <main className="mx-auto w-full max-w-6xl p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><h1 className="text-3xl font-semibold tracking-tight">{partner.name} Partner</h1><p className="mt-2 text-sm text-muted-foreground">Manage customer organizations, their shared plans, and workspace credits.</p></div>
        <Button asChild variant="outline"><a href={partner.domain?.hostname ? `https://${partner.domain.hostname}` : '/'} target="_blank" rel="noreferrer">Open partner portal <ExternalLink /></a></Button>
      </div>
      <Tabs defaultValue="overview" className="mt-8">
        <TabsList variant="line"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="organizations">Organizations</TabsTrigger><TabsTrigger value="accounts">Accounts</TabsTrigger><TabsTrigger value="brand">Brand &amp; Domain</TabsTrigger></TabsList>
        <TabsContent value="overview" className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Active organizations" value={overview?.activeOrganizations ?? 0} /><Metric label="Credit grants" value={overview?.grantCount ?? 0} /><Metric label="Credits granted" value={overview?.totalGrantedCredits ?? 0} />
          </div>
          <div className="mt-6 overflow-hidden rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Organization</th><th>Plan</th><th>Monthly</th><th>Added</th><th>Remaining</th><th>Last grant</th><th /></tr></thead><tbody>{organizations.map((organization) => <tr key={organization.partnerOrganizationId} className="border-t"><td className="p-3 font-medium">{organization.name}<span className="ml-2 text-xs text-muted-foreground">{organization.status}</span></td><td><select value={organization.planKey} onChange={(event) => void run(() => assignPlan({ partnerOrganizationId: organization.partnerOrganizationId, planKey: event.target.value as (typeof planOptions)[number] }), 'Plan updated. Monthly credits change on the next cycle.')}>{planOptions.map((plan) => <option key={plan}>{plan}</option>)}</select></td><td>{organization.monthlyAllowance}</td><td>{organization.addedCredits}</td><td>{organization.remainingCredits}</td><td>{organization.lastGrantAt ? new Date(organization.lastGrantAt).toLocaleDateString() : '—'}</td><td><Button size="sm" variant="ghost" onClick={() => setSelectedOrganizationId(organization.partnerOrganizationId)}>Manage</Button></td></tr>)}</tbody></table></div>
          <div className="mt-4 flex max-w-md gap-2"><Input value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} placeholder="Credits to add" inputMode="numeric" /><Button disabled={!selectedOrganization} onClick={() => void run(async () => { await grantCredits({ partnerOrganizationId: selectedOrganization!.partnerOrganizationId, credits: Number(creditAmount) }); setCreditAmount(''); }, 'Credits added to this organization.')}><WalletCards /> Add credits</Button></div>
        </TabsContent>
        <TabsContent value="organizations" className="pt-6"><div className="max-w-lg space-y-3 rounded-xl border p-5"><h2 className="font-medium">Create customer organization</h2><Input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Organization name" /><select className="h-9 rounded-md border bg-background px-3" value={organizationPlan} onChange={(event) => setOrganizationPlan(event.target.value as (typeof planOptions)[number])}>{planOptions.map((plan) => <option key={plan}>{plan}</option>)}</select><Button onClick={() => void run(async () => { await createOrganization({ name: organizationName, planKey: organizationPlan }); setOrganizationName(''); }, 'Customer organization created.')}><Plus /> Create organization</Button></div><div className="mt-5 space-y-2">{organizations.map((organization) => <div key={organization.partnerOrganizationId} className="flex items-center justify-between rounded-lg border p-3"><span>{organization.name}</span><Button size="sm" variant="outline" onClick={() => void run(() => setStatus({ partnerOrganizationId: organization.partnerOrganizationId, status: organization.status === 'active' ? 'suspended' : 'active' }), organization.status === 'active' ? 'Organization suspended.' : 'Organization reactivated.')}>{organization.status === 'active' ? 'Suspend' : 'Reactivate'}</Button></div>)}</div></TabsContent>
        <TabsContent value="accounts" className="pt-6"><div className="max-w-lg space-y-3 rounded-xl border p-5"><h2 className="font-medium">Invite customer account</h2><select className="h-9 w-full rounded-md border bg-background px-3" value={selectedOrganization?.partnerOrganizationId ?? ''} onChange={(event) => setSelectedOrganizationId(event.target.value)}>{organizations.map((organization) => <option key={organization.partnerOrganizationId} value={organization.partnerOrganizationId}>{organization.name}</option>)}</select><Input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" /><select className="h-9 rounded-md border bg-background px-3" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)}><option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Member</option></select><Button disabled={!selectedOrganization} onClick={() => void run(async () => { await inviteAccount({ partnerOrganizationId: selectedOrganization!.partnerOrganizationId, email: inviteEmail, role: inviteRole }); setInviteEmail(''); }, 'Invitation sent.')} >Invite account</Button></div></TabsContent>
        <TabsContent value="brand" className="pt-6"><div className="max-w-lg space-y-3 rounded-xl border p-5"><h2 className="font-medium">Brand &amp; domain</h2><Input defaultValue={partner.name} onChange={(event) => setBrandName(event.target.value)} placeholder="Partner name" /><Input defaultValue={partner.domain?.hostname ?? ''} onChange={(event) => setHostname(event.target.value)} placeholder="app.partner.com" /><p className="text-sm text-muted-foreground">Hostname status: {partner.domain?.status ?? 'not configured'}. DNS and TLS activate after Cloudflare validates the hostname.</p><Button onClick={() => void run(() => updateBrand({ name: brandName || partner.name, hostname: hostname || undefined }), 'Brand and domain saved.')} >Save brand &amp; domain</Button></div></TabsContent>
      </Tabs>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value.toLocaleString()}</p></div>; }
