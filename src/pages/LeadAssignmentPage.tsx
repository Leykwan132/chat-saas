import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import {
  Check,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  UserRoundCheck,
  ArrowUpNarrowWide,
} from 'lucide-react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '../../shared/permissions';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

type TeamUser = {
  _id: Id<'users'>;
  workosUserId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

type AssignmentMethod = 'round_robin' | 'priority' | 'tags';

type TagRule = {
  tag: string;
  workosUserId: string;
};

const ASSIGNMENT_METHOD_OPTIONS: Array<{
  value: AssignmentMethod;
  label: string;
  description: string;
  icon: typeof RefreshCw;
}> = [
  {
    value: 'round_robin',
    label: 'Round robin',
    description: 'Rotate leads evenly across eligible teammates.',
    icon: RefreshCw,
  },
  {
    value: 'priority',
    label: 'Priority',
    description: 'Assign to the highest-priority teammate on shift.',
    icon: ArrowUpNarrowWide,
  },
  {
    value: 'tags',
    label: 'Tags',
    description: 'Route leads by matching conversation or customer tags.',
    icon: Tag,
  },
];

function memberLabel(u: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name.length > 0 ? name : u.email;
}

function methodLabel(method: AssignmentMethod) {
  return ASSIGNMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method;
}

export default function LeadAssignmentPage() {
  const { agentId } = useParams();
  const typedAgentId = agentId as Id<'agents'> | undefined;
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canManage = can(Permission.ROUTING_MANAGE);

  const settings = useQuery(
    api.leadRouting.settings.getForAgent,
    typedAgentId ? { agentId: typedAgentId } : 'skip',
  );
  const eligibleIds = useQuery(
    api.leadRouting.settings.listEligibleUsers,
    typedAgentId ? { agentId: typedAgentId } : 'skip',
  );
  const rosterCount = useQuery(
    api.leadRouting.settings.rosterCount,
    typedAgentId ? { agentId: typedAgentId } : 'skip',
  );
  const teamUsers = useQuery(api.users.getUsers, {});

  const updateSettings = useMutation(api.leadRouting.settings.updateForAgent);

  const [method, setMethod] = useState<AssignmentMethod>('round_robin');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [tagRules, setTagRules] = useState<TagRule[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setMethod(settings.method);
    setAiEnabled(settings.aiEnabledOnInbound);
    setTagRules(settings.tagRules ?? []);
  }, [settings]);

  const rosterUsers = useMemo(() => {
    if (!teamUsers) return [];
    return teamUsers as TeamUser[];
  }, [teamUsers]);

  const eligibleUsers = useMemo(() => {
    if (!eligibleIds || !teamUsers) return [];
    const set = new Set(eligibleIds);
    return (teamUsers as TeamUser[]).filter((u) => set.has(u.workosUserId));
  }, [eligibleIds, teamUsers]);

  const handleSave = async () => {
    if (!typedAgentId || !canManage) return;
    setSaving(true);
    try {
      await updateSettings({
        agentId: typedAgentId,
        method,
        aiEnabledOnInbound: aiEnabled,
        tagRules: method === 'tags' ? tagRules : [],
      });
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const addTagRule = () => {
    const defaultUserId = rosterUsers[0]?.workosUserId ?? '';
    setTagRules((current) => [...current, { tag: '', workosUserId: defaultUserId }]);
  };

  const updateTagRule = (index: number, patch: Partial<TagRule>) => {
    setTagRules((current) =>
      current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  };

  const removeTagRule = (index: number) => {
    setTagRules((current) => current.filter((_, i) => i !== index));
  };

  if (!typedAgentId) {
    return null;
  }

  const isLoading =
    settings === undefined ||
    eligibleIds === undefined ||
    rosterCount === undefined ||
    teamUsers === undefined;

  if (isLoading) {
    return <LeadAssignmentPageSkeleton />;
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <header className="border-b border-border pb-6">
        <h1 className="m-0 text-4xl font-semibold tracking-tight text-foreground">
          Lead Assignment
        </h1>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-6 min-w-0">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <span className="text-[11px] font-medium text-muted-foreground">Roster Size</span>
              <p className="mt-1 text-2xl font-semibold text-foreground">{rosterCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <span className="text-[11px] font-medium text-muted-foreground">Eligible Now</span>
              <p className="mt-1 text-2xl font-semibold text-foreground">{eligibleUsers.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <span className="text-[11px] font-medium text-muted-foreground">Assignment Rule</span>
              <p className="mt-1 text-base font-semibold text-foreground truncate">
                {methodLabel(method)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">AI Auto-Replies</span>
              <div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1',
                    aiEnabled
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {aiEnabled ? 'Active' : 'Off'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserRoundCheck className="size-4" />
              <span>Assignment rules</span>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <div className="px-5 py-5">
                <div className="grid gap-5">
                  <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-5">
                    <div>
                      <Label htmlFor="ai-replies-switch" className="text-sm font-semibold cursor-pointer">
                        AI replies by default
                      </Label>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        For new inbound conversations.
                      </p>
                    </div>
                    <Switch
                      id="ai-replies-switch"
                      checked={aiEnabled}
                      onCheckedChange={setAiEnabled}
                      disabled={!canManage}
                    />
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Rule
                    </span>
                    <div className="flex flex-col gap-2">
                      {ASSIGNMENT_METHOD_OPTIONS.map(({ value, label, description, icon: Icon }) => {
                        const active = method === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => canManage && setMethod(value)}
                            disabled={!canManage}
                            className="text-left focus:outline-none w-full"
                          >
                            <div
                              className={cn(
                                'relative flex flex-col gap-1 rounded-lg border bg-card px-3.5 py-3 transition-colors duration-200 cursor-pointer',
                                active
                                  ? 'border-foreground bg-accent/40'
                                  : 'border-border hover:border-foreground/35 hover:bg-accent/20',
                                !canManage && 'cursor-not-allowed opacity-60',
                              )}
                            >
                              {active && (
                                <Check className="absolute right-3 top-3 size-3.5 text-foreground" />
                              )}
                              <div className="flex items-center gap-2 pr-6">
                                <Icon
                                  className={cn(
                                    'size-4 shrink-0 stroke-[1.5]',
                                    active ? 'text-foreground' : 'text-muted-foreground/45',
                                  )}
                                />
                                <p className="text-sm font-semibold leading-tight text-foreground">
                                  {label}
                                </p>
                              </div>
                              <p className="text-[11px] leading-snug text-muted-foreground">
                                {description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {method === 'priority' ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Set each teammate&apos;s priority on the{' '}
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => navigate(`/dashboard/${agentId}/schedule`)}
                      >
                        Schedule
                      </button>{' '}
                      page. Lower numbers are assigned first.
                    </p>
                  ) : null}

                  {method === 'tags' ? (
                    <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Tag rules
                          </span>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            Match conversation or customer tags to a teammate.
                          </p>
                        </div>
                        {canManage ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={addTagRule}
                          >
                            <Plus className="size-3.5" />
                            Add rule
                          </Button>
                        ) : null}
                      </div>

                      {tagRules.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                          No tag rules yet. Unmatched leads fall back to round robin.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {tagRules.map((rule, index) => (
                            <div
                              key={`${index}-${rule.workosUserId}`}
                              className="grid gap-2 rounded-lg border border-border/60 bg-muted/10 p-3 sm:grid-cols-[1fr_1fr_auto]"
                            >
                              <div>
                                <Label className="text-[11px] text-muted-foreground">Tag</Label>
                                <Input
                                  value={rule.tag}
                                  onChange={(event) =>
                                    updateTagRule(index, { tag: event.target.value })
                                  }
                                  placeholder="e.g. enterprise"
                                  disabled={!canManage}
                                  className="mt-1 h-9"
                                />
                              </div>
                              <div>
                                <Label className="text-[11px] text-muted-foreground">Assign to</Label>
                                <Select
                                  value={rule.workosUserId}
                                  onValueChange={(value) =>
                                    updateTagRule(index, { workosUserId: value })
                                  }
                                  disabled={!canManage}
                                >
                                  <SelectTrigger className="mt-1 h-9">
                                    <SelectValue placeholder="Select teammate" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rosterUsers.map((user) => (
                                      <SelectItem key={user._id} value={user.workosUserId}>
                                        {memberLabel(user)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {canManage ? (
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => removeTagRule(index)}
                                  >
                                    <Trash2 className="size-4 text-muted-foreground" />
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {canManage ? (
                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        className="px-5"
                        disabled={saving}
                        onClick={() => void handleSave()}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <button
            type="button"
            onClick={() => navigate(`/dashboard/${agentId}/schedule`)}
            className="text-left w-full bg-transparent hover:bg-muted/30 rounded-xl p-2 transition-all duration-200 cursor-pointer group flex flex-col gap-3"
          >
            <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-muted/40 relative">
              <img
                src="/schedule_promo.png"
                alt="Schedule promotion illustration"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              />
            </div>

            <div className="flex flex-col px-1 gap-1">
              <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                Want to set shift hours?
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed truncate">
                Ensure active agents get leads.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadAssignmentPageSkeleton() {
  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div className="border-b border-border pb-6">
        <Skeleton className="h-9 w-52" />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-xl border border-border bg-card px-5 py-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-4 h-16 w-full rounded-lg" />
            <Skeleton className="mt-2 h-16 w-full rounded-lg" />
            <Skeleton className="mt-2 h-16 w-full rounded-lg" />
            <Skeleton className="mt-5 h-9 w-16" />
          </section>
        </div>

        <div className="w-full flex flex-col gap-3 p-2">
          <Skeleton className="w-full aspect-[4/3] rounded-lg" />
          <div className="flex flex-col gap-1.5 px-1">
            <Skeleton className="h-4.5 w-32 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
