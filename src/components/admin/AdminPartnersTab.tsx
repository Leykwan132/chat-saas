import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { whiteLabelApi } from '@/lib/whiteLabelApi';

export function AdminPartnersTab({ sessionToken, enabled }: { sessionToken: string; enabled: boolean }) {
  const [ownerEmail, setOwnerEmail] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [teamId, setTeamId] = useState('');
  const workspaces = useQuery(whiteLabelApi.admin.getOwnerWorkspaces, enabled && ownerEmail ? { sessionToken, ownerEmail } : 'skip');
  const partners = useQuery(whiteLabelApi.admin.listPartners, enabled ? { sessionToken } : 'skip');
  const createPartner = useMutation(whiteLabelApi.admin.createPartner);
  const selectedWorkspace = workspaces?.find((workspace) => workspace.teamId === teamId);
  const submit = async () => {
    if (!partnerName.trim() || !selectedWorkspace) { toast.error('Enter a partner name and choose the owner workspace.'); return; }
    try { await createPartner({ sessionToken, name: partnerName, controlTeamId: selectedWorkspace.teamId, ownerWorkosUserId: selectedWorkspace.workosUserId }); setPartnerName(''); setTeamId(''); toast.success('Partner access granted.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create partner.'); }
  };
  return <div className="space-y-6"><div className="max-w-xl space-y-3 rounded-xl border p-5"><h2 className="font-medium">Whitelist partner</h2><p className="text-sm text-muted-foreground">Bind one existing owner and workspace as the partner control workspace.</p><Input value={ownerEmail} onChange={(event) => { setOwnerEmail(event.target.value); setTeamId(''); }} placeholder="Partner owner email" /><Input value={partnerName} onChange={(event) => setPartnerName(event.target.value)} placeholder="Partner brand name" /><select className="h-9 w-full rounded-md border bg-background px-3" value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="">Select control workspace</option>{workspaces?.map((workspace) => <option key={workspace.teamId} value={workspace.teamId}>{workspace.name}</option>)}</select><Button onClick={() => void submit()}>Whitelist partner</Button></div><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Partner</th><th>Control workspace</th><th>Owner</th><th>Tokens</th><th>AI cost</th><th>Requests</th><th>Assigned agents</th><th>Status</th></tr></thead><tbody>{partners?.map((partner) => <tr key={partner.partnerId} className="border-t"><td className="p-3 font-medium">{partner.name}</td><td>{partner.controlWorkspace}</td><td>{partner.ownerWorkosUserId}</td><td>{partner.totalTokens.toLocaleString()}</td><td>${partner.totalCostUsd.toFixed(4)}</td><td>{partner.requestCount.toLocaleString()}</td><td>{partner.assignedAgentCount}</td><td>{partner.status}</td></tr>)}</tbody></table></div></div>;
}
