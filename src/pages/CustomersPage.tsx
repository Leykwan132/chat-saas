import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { usePaginatedQuery } from 'convex-helpers/react';
import { Users, Search, Plus, Mail, Loader2, User, Check, ChevronDown } from 'lucide-react';
import { isLeadTemperatureTag, getLeadTemperatureStyle, type LeadTemperature } from '@/lib/leadTemperature';
import { SiInstagram, SiMessenger, SiWhatsapp } from 'react-icons/si';
import { toast } from 'sonner';
import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Customer = Doc<'customers'> & {
  assignedUserId?: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignToAiAgent?: boolean;
};

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

function customerPhone(customer: Customer): string | null {
  const phone = customer.phone?.trim();
  if (phone) return phone;
  if (customer.service === 'whatsapp') {
    const addr = customer.contactAddress?.trim();
    if (addr) return addr;
  }
  return null;
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
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [filterSearchInput, setFilterSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggleFilter = (filterKey: string) => {
    setSelectedFilters((prev) => {
      if (prev.includes(filterKey)) {
        return prev.filter((x) => x !== filterKey);
      } else {
        return [...prev, filterKey];
      }
    });
  };

  const teamUsers = useQuery(api.users.getUsers, {});

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const { results: customers, status, loadMore } = usePaginatedQuery(
    api.customers.listForCurrentOrg,
    {},
    { initialNumItems: ITEMS_PER_PAGE },
  );

  const allExistingTags = useMemo(() => {
    const tagsSet = new Set<string>();
    for (const c of customers) {
      if (c.tags) {
        for (const tag of c.tags) {
          tagsSet.add(tag);
        }
      }
    }
    return Array.from(tagsSet).sort();
  }, [customers]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activePlatforms = selectedFilters.filter(f => f.startsWith('platform:')).map(f => f.slice(9));
    const activeTags = selectedFilters.filter(f => f.startsWith('tag:')).map(f => f.slice(4));
    const activeLeads = selectedFilters.filter(f => f.startsWith('lead:')).map(f => f.slice(5));

    return customers.filter((c) => {
      if (activePlatforms.length > 0) {
        if (!activePlatforms.includes(c.service)) return false;
      }
      if (activeTags.length > 0) {
        if (!c.tags || !c.tags.some(t => activeTags.includes(t))) return false;
      }
      if (activeLeads.length > 0) {
        if (!c.leadTemperature || !activeLeads.includes(c.leadTemperature)) return false;
      }
      if (!q) return true;
      const haystack = [c.name, c.email, c.phone, c.contactAddress]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, search, selectedFilters]);

  const runBackfill = useMutation(api.customers.backfillLeadTemperature);
  useEffect(() => {
    runBackfill()
      .then((res) => console.log('Successfully completed lead temperature backfill:', res))
      .catch((err) => console.error('Failed backfill:', err));
  }, [runBackfill]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFilters]);

  const totalPages = Math.max(1, Math.ceil(visible.length / ITEMS_PER_PAGE));
  const hasNextPage = status === 'CanLoadMore' || (currentPage * ITEMS_PER_PAGE < visible.length);

  const handleNextPage = () => {
    if (!hasNextPage) return;
    const nextIndex = currentPage * ITEMS_PER_PAGE;
    if (nextIndex >= customers.length && status === 'CanLoadMore') {
      void loadMore(ITEMS_PER_PAGE);
    }
    setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const pageCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return visible.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [visible, currentPage]);

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

      {status === 'LoadingFirstPage' ? (
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
                  background: 'var(--color-background)',
                  color: 'var(--color-foreground)',
                  outline: 'none', boxSizing: 'border-box',
                }}
                className="bg-white dark:bg-zinc-950"
              />
            </div>
            <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-[38px] min-w-[140px] text-xs border border-border rounded-lg bg-white dark:bg-zinc-950 text-foreground shadow-none font-normal justify-between gap-1.5 px-3"
                >
                  <span className="truncate text-left flex items-center gap-1.5">
                    {selectedFilters.length === 0 ? (
                      <span className="text-muted-foreground">Filter</span>
                    ) : selectedFilters.length === 1 ? (
                      (() => {
                        const filter = selectedFilters[0];
                        if (filter.startsWith('platform:')) {
                          const key = filter.slice(9);
                          const platform = [
                            { key: 'whatsapp', label: 'WhatsApp', icon: SiWhatsapp, colorClass: 'text-[#25D366]' },
                            { key: 'instagram', label: 'Instagram', icon: SiInstagram, colorClass: 'text-[#E4405F]' },
                            { key: 'messenger', label: 'Messenger', icon: SiMessenger, colorClass: 'text-[#0866FF]' },
                            { key: 'manual', label: 'Manual', icon: User, colorClass: 'text-zinc-500 dark:text-zinc-400' },
                          ].find((p) => p.key === key);
                          if (!platform) return <span className="text-muted-foreground">Filter</span>;
                          const Icon = platform.icon;
                          return (
                            <>
                              <Icon className={cn("size-3.5 shrink-0", platform.colorClass)} />
                              <span>{platform.label}</span>
                            </>
                          );
                        } else if (filter.startsWith('lead:')) {
                          const tag = filter.slice(5) as LeadTemperature;
                          const style = getLeadTemperatureStyle(tag);
                          const Icon = style.icon;
                          return (
                            <>
                              <Icon className={cn("size-3.5 shrink-0", style.iconClass)} />
                              <span>{tag}</span>
                            </>
                          );
                        } else {
                          const name = filter.slice(4);
                          return (
                            <>
                              <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass(name).dot)} />
                              <span className="truncate">{name}</span>
                            </>
                          );
                        }
                      })()
                    ) : (
                      <span className="text-foreground font-medium">
                        {selectedFilters.length} filters active
                      </span>
                    )}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0 opacity-50 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[200px] rounded-2xl shadow-lg border border-border bg-popover" align="end">
                <Command className="p-1">
                  <CommandInput
                    placeholder="Search filters..."
                    value={filterSearchInput}
                    onValueChange={setFilterSearchInput}
                  />
                  <CommandList className="max-h-60 overflow-y-auto no-scrollbar">
                    <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">No filters found.</CommandEmpty>
                    
                    <CommandGroup heading="All">
                      <CommandItem
                        value="all All Customers"
                        onSelect={() => {
                          setSelectedFilters([]);
                          setFilterSearchInput('');
                        }}
                        className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                      >
                        <span>All Customers</span>
                        {selectedFilters.length === 0 && <Check className="size-3 text-foreground shrink-0" />}
                      </CommandItem>
                    </CommandGroup>
                    
                    <CommandGroup heading="Platform">
                      {([
                        { key: 'whatsapp', label: 'WhatsApp', icon: SiWhatsapp, colorClass: 'text-[#25D366]' },
                        { key: 'instagram', label: 'Instagram', icon: SiInstagram, colorClass: 'text-[#E4405F]' },
                        { key: 'messenger', label: 'Messenger', icon: SiMessenger, colorClass: 'text-[#0866FF]' },
                        { key: 'manual', label: 'Manual', icon: User, colorClass: 'text-zinc-500 dark:text-zinc-400' },
                      ] as const).map((platform) => {
                        const isSelected = selectedFilters.includes(`platform:${platform.key}`);
                        const Icon = platform.icon;
                        return (
                          <CommandItem
                            key={platform.key}
                            value={`platform:${platform.key} ${platform.label}`}
                            onSelect={() => {
                              handleToggleFilter(`platform:${platform.key}`);
                            }}
                            className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={cn("size-3.5 shrink-0", platform.colorClass)} />
                              <span>{platform.label}</span>
                            </div>
                            {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    
                    <CommandSeparator />
                    <CommandGroup heading="Lead Status">
                      {(['Hot', 'Warm', 'Cold'] as const).map((status) => {
                        const isSelected = selectedFilters.includes(`lead:${status}`);
                        const style = getLeadTemperatureStyle(status);
                        const Icon = style.icon;
                        return (
                          <CommandItem
                            key={status}
                            value={`lead:${status}`}
                            onSelect={() => {
                              handleToggleFilter(`lead:${status}`);
                            }}
                            className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={cn("size-3.5 shrink-0", style.iconClass)} />
                              <span>{status}</span>
                            </div>
                            {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>

                    {allExistingTags.length > 0 && (
                      <CommandGroup heading="Tags">
                        {allExistingTags.map((tag) => {
                          const isSelected = selectedFilters.includes(`tag:${tag}`);
                          return (
                            <CommandItem
                              key={tag}
                              value={`tag:${tag}`}
                              onSelect={() => {
                                handleToggleFilter(`tag:${tag}`);
                              }}
                              className="flex items-center justify-between text-xs cursor-pointer py-1.5 px-3 rounded-xl data-[selected=true]:bg-muted"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className={cn("size-1.5 rounded-full shrink-0", getTagColorClass(tag).dot)} />
                                <span className="truncate">{tag}</span>
                              </div>
                              {isSelected && <Check className="size-3 text-foreground shrink-0" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-border overflow-hidden">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                  {['Customer', 'Assignee', 'Phone', 'Source', 'Tags', 'Last Active'].map((h) => (
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
                {pageCustomers.map((customer, index) => {
                  const label = serviceLabel(customer.service);
                  const SourceIcon = sourceBadgeInfo[label].icon;
                  const phone = customerPhone(customer);
                  return (
                    <tr
                      key={customer._id}
                      style={{
                        borderBottom: index !== pageCustomers.length - 1 ? '1px solid var(--color-border)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => navigate(`/dashboard/${agentId}/customers/${customer._id}`)}
                    >
                      <td style={{ padding: '13px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-foreground)' }}>
                              {customer.name?.trim() || 'Unnamed customer'}
                            </p>
                            {customer.email && !customer.email.toLowerCase().endsWith('@facebook.com') ? (
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
                        {customer.assignedUserId ? (
                          (() => {
                            const u = teamUsers?.find((m) => m.workosUserId === customer.assignedUserId);
                            const label = u
                              ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email
                              : 'Teammate';
                            return (
                              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                <User className="size-3.5 text-[#6366f1] shrink-0" />
                                <span className="truncate max-w-[120px]" title={label}>{label}</span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground/60 text-xs font-normal">Unassigned</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        {phone ? (
                          <span
                            className="font-mono text-xs text-muted-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {phone}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 20px' }}>
                        <Badge variant="outline">
                          <SourceIcon
                            data-icon="inline-start"
                            className={sourceBadgeInfo[label].colorClass}
                          />
                          {label}
                        </Badge>
                      </td>
                      <td style={{ padding: '13px 20px', maxWidth: '280px' }}>
                        <div className="flex flex-wrap gap-1.5">
                          {!customer.leadTemperature && (!customer.tags || customer.tags.length === 0) ? (
                            <span style={{ color: 'var(--color-foreground-muted)' }}>—</span>
                          ) : (
                            <>
                              {customer.leadTemperature && (() => {
                                const style = getLeadTemperatureStyle(customer.leadTemperature);
                                const Icon = style.icon;
                                return (
                                  <span
                                    key={customer.leadTemperature}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all shadow-none",
                                      style.bg,
                                      style.text
                                    )}
                                  >
                                    <Icon className={cn("size-3 shrink-0", style.iconClass)} />
                                    <span className="max-w-[120px] truncate" title={customer.leadTemperature}>
                                      {customer.leadTemperature}
                                    </span>
                                  </span>
                                );
                              })()}
                              {customer.tags && customer.tags
                                .filter((tag) => !isLeadTemperatureTag(tag))
                                .map((tag) => {
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
                                      <span className="max-w-[120px] truncate" title={tag}>
                                        {tag}
                                      </span>
                                    </span>
                                  );
                                })}
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '13px 20px', color: 'var(--color-foreground-muted)' }}>
                        {formatRelative(customer.lastSeenAt)}
                      </td>
                    </tr>
                  );
                })}
                {pageCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-foreground-muted)' }}>
                      No customers match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-border px-6 py-4 bg-zinc-50/50 dark:bg-zinc-900/10 min-h-[58px]">
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            handlePrevPage();
                          }
                        }}
                        className={cn(
                          currentPage === 1 && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNumber);
                            }}
                            isActive={currentPage === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (hasNextPage) {
                            handleNextPage();
                          }
                        }}
                        className={cn(
                          !hasNextPage && "pointer-events-none opacity-50"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
              
              <p className="text-xs text-muted-foreground font-medium text-center sm:text-right sm:absolute sm:right-6">
                Showing {visible.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, visible.length)} of {visible.length} customers
              </p>
            </div>
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
  const [leadTemperature, setLeadTemperature] = useState<'Hot' | 'Warm' | 'Cold' | 'None'>('None');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName('');
    setPhone('');
    setEmail('');
    setTagsRaw('');
    setLeadTemperature('None');
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
        leadTemperature: leadTemperature === 'None' ? undefined : leadTemperature,
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Lead Status</label>
            <Select
              value={leadTemperature}
              onValueChange={(val: any) => setLeadTemperature(val)}
              disabled={busy}
            >
              <SelectTrigger className="w-full bg-background border-border">
                <SelectValue placeholder="Select lead temperature" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Hot">Hot</SelectItem>
                <SelectItem value="Warm">Warm</SelectItem>
                <SelectItem value="Cold">Cold</SelectItem>
              </SelectContent>
            </Select>
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
