import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Users, Search, Plus, Phone, Mail, BadgeCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type Customer = Doc<'customers'>;

const sourceBadgeInfo = {
  WhatsApp: { icon: BadgeCheck },
  Instagram: { icon: BadgeCheck },
  Messenger: { icon: BadgeCheck },
  Manual: { icon: BadgeCheck },
} as const;

function serviceLabel(service: Customer['service']): keyof typeof sourceBadgeInfo {
  switch (service) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'instagram':
      return 'Instagram';
    case 'messenger':
      return 'Messenger';
    default:
      return 'Manual';
  }
}

function formatRelative(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'just now';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<'all' | Customer['service']>(
    'all',
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const result = useQuery(api.customers.listForCurrentOrg, {
    paginationOpts: { numItems: 100, cursor: null },
  });
  const customers: Customer[] = result?.page ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (serviceFilter !== 'all' && c.service !== serviceFilter) return false;
      if (!q) return true;
      const haystack = [c.name, c.email, c.phone, c.contactAddress]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, search, serviceFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">
            Customers
          </h1>
        </div>
        <AddCustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </div>

      {result === undefined ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <div className="flex max-w-sm flex-col gap-1">
            <h2 className="text-lg font-semibold tracking-tight">No customers yet</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Customers will appear here once they message you on a connected
              channel, or you can add one manually.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add Customer
          </Button>
        </div>
      ) : (
        <>
          {/* Search & Filter */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-foreground-subtle)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or email..."
                style={{
                  width: '100%', height: '38px', paddingLeft: '36px', paddingRight: '14px',
                  fontSize: '13px', borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-foreground)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as 'all' | Customer['service'])}
              style={{
                height: '38px', padding: '0 12px', fontSize: '13px',
                borderRadius: '8px', border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', color: 'var(--color-foreground)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="all">All Sources</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="messenger">Messenger</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ background: 'var(--color-surface)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-hover)' }}>
                  {['Customer', 'Phone', 'Source', 'Tags', 'Last Active'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left', padding: '10px 20px',
                        fontSize: '11px', fontWeight: 600,
                        color: 'var(--color-foreground-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: '1px solid var(--color-border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((customer, index) => {
                  const label = serviceLabel(customer.service);
                  const SourceIcon = sourceBadgeInfo[label].icon;
                  return (
                    <tr
                      key={customer._id}
                      style={{
                        borderBottom: index !== visible.length - 1 ? '1px solid var(--color-border)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-foreground)' }}>
                              {customer.name?.trim() || 'Unnamed customer'}
                            </p>
                            {customer.email ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <Mail size={11} color="var(--color-foreground-subtle)" />
                                <span style={{ fontSize: '12px', color: 'var(--color-foreground-muted)' }}>
                                  {customer.email}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-foreground)' }}>
                          <Phone size={13} color="var(--color-foreground-subtle)" />
                          {customer.phone || customer.contactAddress || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <Badge variant="outline">
                          <SourceIcon data-icon="inline-start" />
                          {label}
                        </Badge>
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {customer.tags.length === 0 ? (
                            <span style={{ color: 'var(--color-foreground-muted)' }}>—</span>
                          ) : (
                            customer.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px', color: 'var(--color-foreground-muted)' }}>
                        {formatRelative(customer.lastSeenAt)}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                      No customers match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-foreground-subtle)' }}>
            <Users size={14} />
            <span>
              {customers.length} customer{customers.length === 1 ? '' : 's'} —
              new ones are added automatically when they message you.
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function AddCustomerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addCustomer = useMutation(api.customers.addManually);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName('');
    setPhone('');
    setEmail('');
    setTagsRaw('');
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Customer name is required.');
      return;
    }
    setBusy(true);
    try {
      await addCustomer({
        name: trimmedName,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        tags: tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast.success('Customer added');
      reset();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a customer</DialogTitle>
          <DialogDescription>
            Manually add a customer record. They won't be linked to a messaging
            channel until they reach out.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Chen"
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+60 12-345 6789"
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Tags (comma-separated)
            </label>
            <Input
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="VIP, Lead"
              disabled={busy}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Add customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
