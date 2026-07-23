import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, User, Mail, Phone, Globe, Calendar, Plus, Check, Save, Flame, Sun, Snowflake, Trash2, Loader2, CheckCircle2, ScanFace } from 'lucide-react';
import { isLeadTemperatureTag, isReservedTemperatureTag, getLeadTemperatureStyle } from '@/lib/leadTemperature';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function getTagColorClass(tag: string): { bg: string; text: string; dot: string } {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 6;
  const dotColors = [
    'bg-blue-500 dark:bg-blue-400',
    'bg-emerald-500 dark:bg-emerald-400',
    'bg-violet-500 dark:bg-violet-400',
    'bg-amber-500 dark:bg-amber-400',
    'bg-rose-500 dark:bg-rose-400',
    'bg-cyan-500 dark:bg-cyan-400',
  ];
  return {
    bg: 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200/80 dark:border-zinc-700/60 shadow-none',
    text: 'text-zinc-800 dark:text-zinc-200',
    dot: dotColors[index],
  };
}

const sourceBadgeInfo = {
  WhatsApp: { icon: SiWhatsapp, colorClass: 'text-[#25D366]' },
  Instagram: { icon: SiInstagram, colorClass: 'text-[#E4405F]' },
  Messenger: { icon: SiMessenger, colorClass: 'text-[#0866FF]' },
  Avatar: { icon: ScanFace, colorClass: 'text-muted-foreground' },
  Manual: { icon: User, colorClass: 'text-zinc-500 dark:text-zinc-400' },
} as const;

function serviceLabel(service: string): keyof typeof sourceBadgeInfo {
  switch (service) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'instagram':
      return 'Instagram';
    case 'messenger':
      return 'Messenger';
    case 'avatar':
      return 'Avatar';
    default:
      return 'Manual';
  }
}

export default function CustomerDetailPage() {
  const { agentId, customerId: customerIdParam } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const typedCustomerId = customerIdParam as Id<'customers'> | undefined;
  const navigate = useNavigate();

  const customer = useQuery(
    api.customers.getById,
    typedCustomerId ? { customerId: typedCustomerId } : 'skip'
  );

  const teamUsers = useQuery(api.users.getUsers, {});
  const activeTeam = useQuery(api.teams.getActiveTeam);

  // Fetch loaded customers page to extract all existing organization tags
  const customersResult = useQuery(
    api.customers.listForCurrentOrg,
    { paginationOpts: { numItems: 100, cursor: null } }
  );

  const addTag = useMutation(api.customers.addCustomerTag);
  const removeTag = useMutation(api.customers.removeCustomerTag);
  const updateCustomer = useMutation(api.customers.update);
  const deleteCustomer = useMutation(api.customers.deleteCustomer);

  const [actionModal, setActionModal] = useState<{
    open: boolean;
    status: 'loading' | 'success';
    message: string;
  }>({
    open: false,
    status: 'loading',
    message: '',
  });

  const handleUpdateLeadTemperature = async (value: string) => {
    if (!typedCustomerId) return;
    setActionModal({ open: true, status: 'loading', message: 'Updating lead status...' });
    try {
      await updateCustomer({
        customerId: typedCustomerId,
        leadTemperature: value === 'None' ? null : (value as any),
      });
      setActionModal({ open: true, status: 'success', message: 'Lead status updated' });
      setTimeout(() => setActionModal(prev => ({ ...prev, open: false })), 1200);
    } catch (e) {
      setActionModal(prev => ({ ...prev, open: false }));
      toast.error(e instanceof Error ? e.message : 'Could not update lead status');
    }
  };

  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearchInput, setTagSearchInput] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCustomFields, setEditCustomFields] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleStartEdit = () => {
    setEditName(customer?.name ?? '');
    setEditEmail(customer?.email ?? '');
    setEditPhone(customer?.phone ?? '');
    setEditNotes(customer?.notes ?? '');
    setEditCustomFields(customer?.customFields ?? {});
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!typedCustomerId) return;
    setIsSaving(true);
    try {
      await updateCustomer({
        customerId: typedCustomerId,
        name: editName,
        email: editEmail,
        phone: editPhone,
        notes: editNotes,
        customFields: editCustomFields,
      });
      toast.success('Saved');
      setIsEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update customer details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!typedCustomerId || !typedAgentId) return;

    setActionModal({ open: true, status: 'loading', message: 'Deleting customer...' });
    setIsDeletingCustomer(true);
    setDeleteConfirmOpen(false);
    try {
      await deleteCustomer({ customerId: typedCustomerId });
      setActionModal({ open: true, status: 'success', message: 'Customer deleted successfully' });
      setTimeout(() => {
        setActionModal(prev => ({ ...prev, open: false }));
        navigate(`/dashboard/${typedAgentId}/customers`);
      }, 1200);
    } catch (e) {
      setActionModal(prev => ({ ...prev, open: false }));
      toast.error(e instanceof Error ? e.message : 'Could not delete customer');
      setIsDeletingCustomer(false);
    }
  };

  const isLoading = customer === undefined || teamUsers === undefined || customersResult === undefined || activeTeam === undefined;

  const label = customer ? serviceLabel(customer.service) : 'Manual';
  const SourceIcon = sourceBadgeInfo[label].icon;

  const assigneeUser = useMemo(() => {
    if (!customer?.assignedUserId || !teamUsers) return null;
    return teamUsers.find((u) => u.workosUserId === customer.assignedUserId);
  }, [customer?.assignedUserId, teamUsers]);

  const allExistingTags = useMemo(() => {
    if (!customersResult) return [];
    const tagsSet = new Set<string>();
    for (const c of customersResult.page) {
      if (c.tags) {
        for (const tag of c.tags) {
          tagsSet.add(tag);
        }
      }
    }
    return Array.from(tagsSet).sort();
  }, [customersResult]);

  const handleAddTag = async (tag: string) => {
    if (!typedCustomerId) return;
    setActionModal({ open: true, status: 'loading', message: 'Adding tag...' });
    try {
      await addTag({ customerId: typedCustomerId, tag });
      setActionModal({ open: true, status: 'success', message: `Tag "${tag}" added` });
      setTagSearchInput('');
      setTagPopoverOpen(false);
      setTimeout(() => setActionModal(prev => ({ ...prev, open: false })), 1200);
    } catch (e) {
      setActionModal(prev => ({ ...prev, open: false }));
      toast.error(e instanceof Error ? e.message : 'Could not add tag');
    }
  };

  const handleToggleTag = async (tag: string, isSelected: boolean) => {
    if (!typedCustomerId) return;
    setActionModal({
      open: true,
      status: 'loading',
      message: isSelected ? `Removing tag "${tag}"...` : `Adding tag "${tag}"...`
    });
    try {
      if (isSelected) {
        await removeTag({ customerId: typedCustomerId, tag });
        setActionModal({ open: true, status: 'success', message: `Tag "${tag}" removed` });
      } else {
        await addTag({ customerId: typedCustomerId, tag });
        setActionModal({ open: true, status: 'success', message: `Tag "${tag}" added` });
      }
      setTimeout(() => setActionModal(prev => ({ ...prev, open: false })), 1200);
    } catch (e) {
      setActionModal(prev => ({ ...prev, open: false }));
      toast.error(e instanceof Error ? e.message : 'Could not update tag');
    }
  };

  if (!typedAgentId || !typedCustomerId) return null;

  if (isLoading) {
    return <CustomerDetailSkeleton />;
  }

  if (customer === null) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-4">
        <Link
          to={`/dashboard/${typedAgentId}/customers`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <p className="text-sm text-muted-foreground">Customer record not found.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      {/* Back link & header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            to={`/dashboard/${typedAgentId}/customers`}
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Customers
          </Link>
          <div>
            {isEditing ? (
              <div className="flex gap-2">
                 <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving} className="h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-transparent px-2 rounded-lg">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 text-xs rounded-lg bg-black hover:bg-black/90 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 flex items-center gap-1.5 border border-zinc-900 dark:border-zinc-100">
                  <Save className="size-3.5 shrink-0" />
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isDeletingCustomer}
                  className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 dark:hover:text-red-400 rounded-lg shrink-0"
                  title="Delete Customer"
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleStartEdit} disabled={isDeletingCustomer} className="h-8 text-xs rounded-lg">
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 w-full space-y-1">
            <div className="flex flex-col gap-1 w-full">
              {isEditing ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Customer Name"
                  />
                </div>
              ) : (
                <>
                  <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">
                    {customer.name?.trim() || 'Unnamed Customer'}
                  </h1>
                  {customer.email && !customer.email.toLowerCase().endsWith('@facebook.com') && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Mail className="size-3.5 text-muted-foreground/75" />
                      {customer.email}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Platform & Assignee Card */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Platform & Assignment</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</span>
              <span className="text-foreground flex items-center gap-2 font-medium mt-1">
                <SourceIcon className={cn("size-3.5 shrink-0", sourceBadgeInfo[label].colorClass)} />
                {label}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Assignee</span>
              <span className="text-foreground flex items-center gap-2 font-medium mt-1">
                {customer.assignedUserId ? (
                  <>
                    <User className="size-3.5 text-[#6366f1] shrink-0" />
                    <span>
                      {assigneeUser
                        ? [assigneeUser.firstName, assigneeUser.lastName].filter(Boolean).join(' ') || assigneeUser.email
                        : 'Teammate'}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground/60 font-normal">Unassigned</span>
                )}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead Status</span>
              <Select
                value={customer.leadTemperature || 'None'}
                onValueChange={handleUpdateLeadTemperature}
                disabled={isEditing}
              >
                <SelectTrigger className="w-full max-w-[140px] !h-8 py-1 px-2.5 bg-background border-border text-xs rounded-lg mt-0.5">
                  <SelectValue placeholder="Select status">
                    {customer.leadTemperature ? (() => {
                      const temp = customer.leadTemperature;
                      const style = getLeadTemperatureStyle(temp);
                      const Icon = style.icon;
                      return (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Icon className={cn("size-3.5 shrink-0", style.iconClass)} />
                          {temp}
                        </span>
                      );
                    })() : (
                      'None'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Hot">
                    <span className="flex items-center gap-1.5">
                      <Flame className="size-3.5 text-red-500 dark:text-red-400" />
                      Hot
                    </span>
                  </SelectItem>
                  <SelectItem value="Warm">
                    <span className="flex items-center gap-1.5">
                      <Sun className="size-3.5 text-amber-500 dark:text-amber-400" />
                      Warm
                    </span>
                  </SelectItem>
                  <SelectItem value="Cold">
                    <span className="flex items-center gap-1.5">
                      <Snowflake className="size-3.5 text-sky-500 dark:text-sky-400" />
                      Cold
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Info Card */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Details</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Phone number"
                />
              ) : (
                <span className="text-foreground flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground/75" />
                  {customer.phone || '—'}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</span>
              {isEditing ? (
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Email"
                />
              ) : (
                <span className="text-foreground flex items-center gap-2">
                  <Mail className="size-3.5 text-muted-foreground/75" />
                  {customer.email || '—'}
                </span>
              )}
            </div>


            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Seen</span>
              <span className="text-foreground flex items-center gap-2">
                <Calendar className="size-3.5 text-muted-foreground/75" />
                {new Date(customer.firstSeenAt).toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Activity</span>
              <span className="text-foreground flex items-center gap-2">
                <Globe className="size-3.5 text-muted-foreground/75" />
                {new Date(customer.lastSeenAt).toLocaleString()}
              </span>
            </div>

            {activeTeam && activeTeam.customFields && activeTeam.customFields.map((field) => {
              const key = field.key;
              const label = field.label;
              const rawValue = customer?.customFields?.[key];
              const hasValue = typeof rawValue === 'string' && rawValue.trim() !== '';

              if (!isEditing && !hasValue) return null;

              const value = rawValue || '—';

              return (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editCustomFields[key] ?? ''}
                      onChange={(e) => setEditCustomFields(prev => ({
                        ...prev,
                        [key]: e.target.value
                      }))}
                      className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder={label}
                    />
                  ) : (
                    <span className="text-foreground text-sm max-w-xs break-words whitespace-pre-wrap leading-relaxed py-0.5">
                      {value}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tags section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Tags</h2>
          
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 rounded-lg text-xs font-normal">
                <Plus className="size-3.5" />
                Add tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[240px] rounded-2xl shadow-lg border border-border bg-popover" align="end">
              <Command className="p-1">
                <CommandInput
                  placeholder="Select or create new one"
                  value={tagSearchInput}
                  onValueChange={setTagSearchInput}
                />
                <CommandList className="max-h-60 overflow-y-auto no-scrollbar">
                  <CommandEmpty className="py-2.5 text-center text-xs text-muted-foreground">
                    No tags found.
                  </CommandEmpty>
                  
                  {allExistingTags.filter(t => !isLeadTemperatureTag(t)).length > 0 && (
                    <CommandGroup heading="Existing tags">
                      {allExistingTags.filter(t => !isLeadTemperatureTag(t)).map((tag) => {
                        const isSelected = customer.tags.includes(tag);
                        return (
                          <CommandItem
                            key={tag}
                            value={tag}
                            onSelect={() => void handleToggleTag(tag, isSelected)}
                            className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass(tag).dot)} />
                              <span>{tag}</span>
                            </div>
                            {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </CommandList>
                
                {tagSearchInput.trim() &&
                  !isReservedTemperatureTag(tagSearchInput) &&
                  !allExistingTags.some(t => t.toLowerCase() === tagSearchInput.trim().toLowerCase()) && (
                  <div className="p-1 border-t border-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        void handleAddTag(tagSearchInput.trim());
                      }}
                      className="flex w-full items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-muted py-2 px-3 rounded-xl text-left"
                    >
                      <span>+</span>
                      <span>Add new tag: "{tagSearchInput.trim()}"</span>
                    </button>
                  </div>
                )}
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {customer.tags.filter(t => !isLeadTemperatureTag(t)).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">No tags applied to this customer.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              {customer.tags.filter(t => !isLeadTemperatureTag(t)).map((tag) => {
                const colors = getTagColorClass(tag);
                return (
                  <span
                    key={tag}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all shadow-none",
                      colors.bg,
                      colors.text
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full shrink-0", colors.dot)} />
                    <span className="max-w-[150px] truncate" title={tag}>
                      {tag}
                    </span>
                    <button
                      type="button"
                      className="ml-1 rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10 text-current opacity-60 hover:opacity-100"
                      onClick={() => void handleToggleTag(tag, true)}
                      aria-label={`Remove tag ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Notes section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Notes</h2>
        {isEditing ? (
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            className="w-full rounded-xl border border-border bg-card p-5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[120px]"
            placeholder="Add notes about this customer..."
          />
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            {customer.notes?.trim() ? (
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{customer.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground/70 italic">No notes created for this customer.</p>
            )}
          </div>
        )}
      </section>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <span className="font-semibold text-foreground">{customer.name?.trim() || 'this customer'}</span>? This action is permanent and will cascade-delete all associated conversations, messages, logs, facts, and bookings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeletingCustomer}
              className="h-9 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
              className="h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5"
            >
              {isDeletingCustomer ? (
                <>Deleting…</>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionModal.open} onOpenChange={(open) => {
        if (actionModal.status === 'success') {
          setActionModal(prev => ({ ...prev, open }));
        }
      }}>
        <DialogContent className="sm:max-w-[320px] flex flex-col items-center justify-center p-6 gap-4 [&>button]:hidden rounded-2xl">
          {actionModal.status === 'loading' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="size-10 animate-spin text-zinc-600 dark:text-zinc-400" />
              <p className="text-sm font-medium text-foreground">{actionModal.message}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">is done</p>
              <p className="text-xs text-muted-foreground">{actionModal.message}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerDetailSkeleton() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}
