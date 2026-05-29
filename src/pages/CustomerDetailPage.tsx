import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, User, Mail, Phone, Globe, Calendar, Plus, Check } from 'lucide-react';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

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
    default:
      return 'Manual';
  }
}

export default function CustomerDetailPage() {
  const { agentId, customerId: customerIdParam } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const typedCustomerId = customerIdParam as Id<'customers'> | undefined;

  const customer = useQuery(
    api.customers.getById,
    typedCustomerId ? { customerId: typedCustomerId } : 'skip'
  );

  const teamUsers = useQuery(api.users.getUsers, {});

  // Fetch loaded customers page to extract all existing organization tags
  const customersResult = useQuery(
    api.customers.listForCurrentOrg,
    { paginationOpts: { numItems: 100, cursor: null } }
  );

  const addTag = useMutation(api.customers.addCustomerTag);
  const removeTag = useMutation(api.customers.removeCustomerTag);

  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagSearchInput, setTagSearchInput] = useState('');

  const isLoading = customer === undefined || teamUsers === undefined || customersResult === undefined;

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
    try {
      await addTag({ customerId: typedCustomerId, tag });
      toast.success(`Tag "${tag}" added`);
      setTagSearchInput('');
      setTagPopoverOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add tag');
    }
  };

  const handleToggleTag = async (tag: string, isSelected: boolean) => {
    if (!typedCustomerId) return;
    try {
      if (isSelected) {
        await removeTag({ customerId: typedCustomerId, tag });
        toast.success(`Tag "${tag}" removed`);
      } else {
        await addTag({ customerId: typedCustomerId, tag });
        toast.success(`Tag "${tag}" added`);
      }
    } catch (e) {
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
        <Link
          to={`/dashboard/${typedAgentId}/customers`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Customers
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-3xl font-semibold tracking-tight text-foreground">
                {customer.name?.trim() || 'Unnamed Customer'}
              </h1>
              {customer.email && !customer.email.toLowerCase().endsWith('@facebook.com') && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="size-3.5 text-muted-foreground/75" />
                  {customer.email}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Platform & Assignee Card */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Platform & Assignment</h2>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</span>
              <span className="text-foreground flex items-center gap-2 font-medium">
                <SourceIcon className={cn("size-3.5 shrink-0", sourceBadgeInfo[label].colorClass)} />
                {label}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Assignee</span>
              <span className="text-foreground flex items-center gap-2 font-medium">
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
              <span className="text-foreground flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground/75" />
                {customer.phone || '—'}
              </span>
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
                  
                  {allExistingTags.length > 0 && (
                    <CommandGroup heading="Existing tags">
                      {allExistingTags.map((tag) => {
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
                
                {tagSearchInput.trim() && !allExistingTags.some(t => t.toLowerCase() === tagSearchInput.trim().toLowerCase()) && (
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

        {customer.tags.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">No tags applied to this customer.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              {customer.tags.map((tag) => {
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
        <div className="rounded-xl border border-border bg-card p-5">
          {customer.notes?.trim() ? (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{customer.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground/70 italic">No notes created for this customer.</p>
          )}
        </div>
      </section>
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
