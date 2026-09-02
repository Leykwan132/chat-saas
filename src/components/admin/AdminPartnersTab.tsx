import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { whiteLabelApi } from '@/lib/whiteLabelApi';

export function AdminPartnersTab({ sessionToken, enabled }: { sessionToken: string; enabled: boolean }) {
  const [ownerEmail, setOwnerEmail] = useState('');
  const partners = useQuery(whiteLabelApi.admin.listPartners, enabled ? { sessionToken } : 'skip');
  const createPartner = useMutation(whiteLabelApi.admin.createPartner);
  const submit = async () => {
    if (!ownerEmail.trim()) { toast.error('Enter the partner owner email.'); return; }
    try { await createPartner({ sessionToken, ownerEmail }); setOwnerEmail(''); toast.success('Partner access granted.'); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create partner.'); }
  };
  return <div className="space-y-6"><div className="max-w-xl space-y-3 rounded-xl border p-5"><h2 className="font-medium">Whitelist partner</h2><p className="text-sm text-muted-foreground">Grant partner portal access to an email in every workspace they can use.</p><Input value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} placeholder="Partner owner email" /><Button onClick={() => void submit()}>Whitelist partner</Button></div><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[800px] text-sm"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="p-3">Partner</th><th>Owner</th><th>Tokens</th><th>AI cost</th><th>Requests</th><th>Assigned agents</th><th>Status</th></tr></thead><tbody>{partners?.map((partner) => <tr key={partner.partnerId} className="border-t"><td className="p-3 font-medium">{partner.name}</td><td>{partner.ownerEmail}</td><td>{partner.totalTokens.toLocaleString()}</td><td>${partner.totalCostUsd.toFixed(4)}</td><td>{partner.requestCount.toLocaleString()}</td><td>{partner.assignedAgentCount}</td><td>{partner.status}</td></tr>)}</tbody></table></div></div>;
}
